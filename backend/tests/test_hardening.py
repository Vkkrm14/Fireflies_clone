"""Regressions for the review of phases 0-8: bad input must give 4xx, never 500 or corrupted rows."""
import json

import pytest
from sqlalchemy import text

from database.session import engine
from services.transcript_parser import parse_txt


@pytest.fixture()
def meeting(client):
    r = client.post("/api/meetings", data={
        "title": "Hardening", "date": "2026-10-06T10:00:00", "participants": '["A","B"]',
        "transcript_text": "A: hello there\nB: hi back\nA: third line",
    })
    assert r.status_code == 201
    yield r.json()
    client.delete(f"/api/meetings/{r.json()['id']}")


def upload(client, mid, name, content, ctype="text/plain"):
    data = content if isinstance(content, bytes) else content.encode()
    return client.post(f"/api/meetings/{mid}/transcript", files={"file": (name, data, ctype)})


# --- foreign keys / ids -------------------------------------------------------

def test_foreign_keys_are_enforced():
    with engine.connect() as conn:
        assert conn.execute(text("PRAGMA foreign_keys")).scalar() == 1


# --- action items --------------------------------------------------------------

@pytest.mark.parametrize("payload", [{"is_completed": None}, {"text": None}, {"text": "   "}])
def test_action_item_update_rejects_nulls(client, meeting, payload):
    item = client.post(f"/api/meetings/{meeting['id']}/action-items", json={"text": "do it"}).json()
    r = client.put(f"/api/meetings/{meeting['id']}/action-items/{item['id']}", json=payload)
    assert r.status_code == 422
    assert client.get(f"/api/meetings/{meeting['id']}").status_code == 200


def test_action_item_create_rejects_blank_text(client, meeting):
    assert client.post(f"/api/meetings/{meeting['id']}/action-items", json={"text": " "}).status_code == 422


# --- meeting validation --------------------------------------------------------

@pytest.mark.parametrize("payload", [
    {"title": None}, {"title": "  "}, {"duration": None}, {"duration": -5}, {"status": "weird"},
    {"date": None}, {"participants": None}, {"participants": [""]},
])
def test_meeting_update_rejects_bad_values(client, meeting, payload):
    assert client.put(f"/api/meetings/{meeting['id']}", json=payload).status_code == 422
    assert client.get(f"/api/meetings/{meeting['id']}").status_code == 200


@pytest.mark.parametrize("data", [
    {"title": "  ", "date": "2026-10-06"},
    {"title": "x", "date": "2026-10-06", "duration": "-1"},
    {"title": "x", "date": "2026-10-06", "status": "nope"},
    {"title": "x", "date": "2026-10-06", "participants": "[1, 2]"},
    {"title": "x", "date": "2026-10-06", "participants": '{"a": 1}'},
    {"title": "x", "date": "0000-01-01T00:00:00+23:59"},
    {"title": "x", "date": "2026-10-06", "transcript_text": "   "},
])
def test_create_meeting_rejects_bad_input(client, data):
    r = client.post("/api/meetings", data=data)
    assert r.status_code == 422, r.text


def test_list_rejects_unknown_sort(client):
    assert client.get("/api/meetings?sort=sideways").status_code == 422


# --- transcript upload -----------------------------------------------------------

@pytest.mark.parametrize("name,content", [
    ("t.json", "{not json"),
    ("t.json", b"\xff\xfe\x00bad"),
    ("t.json", '[{"speaker":"A","start_time":NaN,"end_time":1,"text":"x"}]'),
    ("t.json", '[{"speaker":"A","start_time":0,"end_time":Infinity,"text":"x"}]'),
    ("t.json", "[1, 2]"),
    ("t.json", '[{"speaker":"A","start_time":0,"end_time":1,"text":null}]'),
    ("t.json", "[]"),
    ("t.pdf", "%PDF-1.4 whatever"),
    ("t.txt", ""),
    ("t.txt", "   \n\n"),
])
def test_bad_transcript_upload_is_422_and_keeps_old_transcript(client, meeting, name, content):
    r = upload(client, meeting["id"], name, content)
    assert r.status_code == 422, r.text
    again = client.get(f"/api/meetings/{meeting['id']}/transcript").json()
    assert len(again) == 3


def test_json_with_bom_is_accepted(client, meeting):
    body = b"\xef\xbb\xbf" + json.dumps([{"speaker": "Z", "start_time": 0, "end_time": 3, "text": "hello"}]).encode()
    r = upload(client, meeting["id"], "t.json", body)
    assert r.status_code == 201 and r.json()[0]["speaker_name"] == "Z"


def test_oversized_upload_is_413(client, meeting):
    r = upload(client, meeting["id"], "t.txt", b"A: hi\n" * 1_100_000)
    assert r.status_code == 413


def test_replacing_transcript_drops_comments_and_refreshes_duration_and_summary(client, meeting):
    mid = meeting["id"]
    seg = client.get(f"/api/meetings/{mid}/transcript").json()[0]
    assert client.post(f"/api/meetings/{mid}/comments", json={"segment_id": seg["id"], "text": "note"}).status_code == 201
    before = client.get(f"/api/meetings/{mid}/summary").json()
    new = json.dumps([
        {"speaker": "Z", "start_time": 0, "end_time": 100, "text": "alpha"},
        {"speaker": "Y", "start_time": 100, "end_time": 700.4, "text": "beta"},
    ])
    r = upload(client, mid, "t.json", new)
    assert r.status_code == 201
    assert client.get(f"/api/meetings/{mid}/comments").json() == []
    detail = client.get(f"/api/meetings/{mid}").json()
    assert detail["duration"] == 701
    assert detail["summary"]["overview"] != before["overview"]


# --- summary ------------------------------------------------------------------------

def test_regenerate_summary_bumps_generated_at(client, meeting):
    mid = meeting["id"]
    first = client.get(f"/api/meetings/{mid}/summary").json()["generated_at"]
    second = client.post(f"/api/meetings/{mid}/summary/generate").json()["generated_at"]
    assert second >= first


def test_short_transcript_has_distinct_chapters(client, meeting):
    chapters = client.get(f"/api/meetings/{meeting['id']}/summary").json()["chapters"]
    starts = [c["start_time"] for c in chapters]
    assert len(starts) == len(set(starts))


# --- search / LIKE wildcards ---------------------------------------------------------

@pytest.mark.parametrize("q", ["%", "_", "\\"])
def test_wildcards_are_literal_in_every_search(client, meeting, q):
    mid = meeting["id"]
    assert client.get("/api/meetings", params={"search": q}).json()["total"] == 0
    assert client.get("/api/meetings", params={"participant": q}).json()["total"] == 0
    assert client.get(f"/api/meetings/{mid}/transcript/search", params={"q": q}).json() == []
    if q != "%":   # the seed data legitimately contains "99.95%"
        assert client.get("/api/search", params={"q": q}).json()["total"] == 0
    else:
        hits = client.get("/api/search", params={"q": q}).json()["results"]
        assert all(q in h["snippet"] for h in hits if h["type"] != "transcript")


def test_blank_search_query_is_422(client, meeting):
    assert client.get("/api/search", params={"q": "   "}).status_code == 422
    assert client.get(f"/api/meetings/{meeting['id']}/transcript/search", params={"q": " "}).status_code == 422


def test_date_only_date_to_includes_that_day(client, meeting):
    r = client.get("/api/meetings", params={"date_from": "2026-10-06", "date_to": "2026-10-06"})
    assert meeting["id"] in [m["id"] for m in r.json()["meetings"]]


def test_global_search_total_counts_all_hits(client):
    body = client.get("/api/search", params={"q": "the"}).json()
    assert body["total"] >= len(body["results"])


# --- export ---------------------------------------------------------------------------

def test_export_with_non_latin_title(client):
    r = client.post("/api/meetings", data={"title": "会議 ロードマップ ✓", "date": "2026-10-06", "transcript_text": "A: hi"})
    mid = r.json()["id"]
    out = client.get(f"/api/meetings/{mid}/export?kind=transcript&format=txt")
    assert out.status_code == 200
    assert "filename*=UTF-8''" in out.headers["content-disposition"]
    client.delete(f"/api/meetings/{mid}")


def test_export_with_very_long_title(client):
    r = client.post("/api/meetings", data={"title": "x" * 300, "date": "2026-10-06", "transcript_text": "A: hi"})
    mid = r.json()["id"]
    out = client.get(f"/api/meetings/{mid}/export?kind=summary&format=md")
    assert out.status_code == 200 and len(out.headers["content-disposition"]) < 400
    client.delete(f"/api/meetings/{mid}")


# --- extras validation / tags -----------------------------------------------------------

def test_extras_validation(client, meeting):
    mid = meeting["id"]
    seg = client.get(f"/api/meetings/{mid}/transcript").json()[0]
    assert client.post(f"/api/meetings/{mid}/soundbites", json={"title": "  ", "start_time": 0, "end_time": 2}).status_code == 422
    assert client.post(f"/api/meetings/{mid}/soundbites", json={"title": "x", "start_time": 0, "end_time": 1e12}).status_code == 422
    assert client.post(f"/api/meetings/{mid}/comments", json={"segment_id": seg["id"], "text": "x" * 5000}).status_code == 422
    assert client.put(f"/api/meetings/{mid}/tags", json={"tags": ["t" * 500]}).status_code == 422
    assert client.post(f"/api/meetings/{mid}/ask", json={"question": "   "}).status_code == 422


def test_deleting_a_meeting_removes_its_orphan_tags(client, meeting):
    mid = meeting["id"]
    assert client.put(f"/api/meetings/{mid}/tags", json={"tags": ["only-here"]}).status_code == 200
    client.delete(f"/api/meetings/{mid}")
    assert "only-here" not in [t["name"] for t in client.get("/api/tags").json()]


# --- .txt parser -------------------------------------------------------------------------

def test_txt_parser_speaker_and_timestamp_variants():
    segs = parse_txt("Alice (00:05): hi\nDr. Smith: hello\nSpeaker 1: yo\nÉlodie Dupont: salut", 1)
    assert [s.speaker_name for s in segs] == ["Alice", "Dr. Smith", "Speaker 1", "Élodie Dupont"]
    assert segs[0].start_time == 5.0


def test_txt_parser_never_produces_end_before_start():
    segs = parse_txt("[00:30] A: later\n[00:10] B: earlier", 1)
    assert all(s.end_time >= s.start_time for s in segs)
