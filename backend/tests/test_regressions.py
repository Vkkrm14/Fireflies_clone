"""Regressions for bugs found in the Phase 0-1 audit."""
from database.session import engine
from sqlalchemy import inspect
from services.transcript_parser import parse_txt, parse_vtt


def test_meeting_detail_includes_decoded_summary(client):
    r = client.get("/api/meetings/1")
    assert r.status_code == 200
    summary = r.json()["summary"]
    assert isinstance(summary["key_topics"], list) and summary["key_topics"]
    assert isinstance(summary["chapters"][0]["start_time"], float)


def test_vtt_with_hours_and_voice_tags():
    vtt = (
        "WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\n<v Alice>Hello there</v>\n\n"
        "00:04.500 --> 00:08.000\nBob: Hi Alice\n\n00:01:00,000 --> 00:01:05,000\nplain line\n"
    )
    segs = parse_vtt(vtt, 1)
    assert [(s.speaker_name, s.start_time, s.end_time) for s in segs] == [
        ("Alice", 1.0, 4.0), ("Bob", 4.5, 8.0), ("Speaker", 60.0, 65.0),
    ]


def test_txt_without_speakers_still_produces_segments():
    segs = parse_txt("just a paragraph\n\nAlice: hi", 1)
    assert [(s.speaker_name, s.text) for s in segs] == [("Speaker", "just a paragraph"), ("Alice", "hi")]


def test_indexes_exist():
    names = {i["name"] for t in ("meetings", "transcript_segments", "action_items") for i in inspect(engine).get_indexes(t)}
    assert {"idx_meetings_date", "idx_transcript_meeting", "idx_action_items_meeting"} <= names


def test_seed_has_rich_transcripts(client):
    meetings = client.get("/api/meetings").json()["meetings"]
    assert len(meetings) >= 6
    for m in meetings:
        detail = client.get(f"/api/meetings/{m['id']}").json()
        assert len(detail["transcript_segments"]) >= 20
        assert detail["media_url"]


def test_create_meeting_derives_duration_and_summary(client):
    r = client.post("/api/meetings", data={
        "title": "tmp", "date": "2026-10-06T10:00:00", "participants": '["A","B"]',
        "transcript_text": "A: hello there\nB: hi",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["duration"] > 0 and body["summary"] and len(body["transcript_segments"]) == 2
    assert client.delete(f"/api/meetings/{body['id']}").status_code == 204


def test_create_meeting_rejects_bad_date(client):
    assert client.post("/api/meetings", data={"title": "x", "date": "nope"}).status_code == 422
