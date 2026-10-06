"""Phase 7 features and audit follow-ups."""


def new_meeting(client, title="Feature Test", text="Ana: We should ship the pricing page Friday.\nBo: Agreed, budget is 40 percent lower."):
    r = client.post("/api/meetings", data={"title": title, "date": "2026-10-06T10:00:00", "participants": '["Ana","Bo"]', "transcript_text": text})
    assert r.status_code == 201
    return r.json()


def test_participant_filter_does_not_duplicate_meetings(client):
    # "a" matches several participants in most meetings; each meeting must appear once
    data = client.get("/api/meetings?participant=a&page_size=100").json()
    ids = [m["id"] for m in data["meetings"]]
    assert len(ids) == len(set(ids))
    assert data["total"] == len(ids)


def test_global_search_finds_summary_text(client):
    summary = client.get("/api/meetings/1/summary").json()["overview"]
    word = next(w for w in summary.split() if len(w) > 7 and w.isalpha())
    results = client.get(f"/api/search?q={word}").json()["results"]
    assert any(r["type"] == "summary" and r["meeting_id"] == 1 for r in results)


def test_media_supports_range_requests(client):
    full = client.get("/media/sample-meeting.wav")
    assert full.status_code == 200 and full.headers["accept-ranges"] == "bytes"
    part = client.get("/media/sample-meeting.wav", headers={"Range": "bytes=0-99"})
    assert part.status_code == 206
    assert len(part.content) == 100
    assert part.headers["content-range"].startswith("bytes 0-99/")
    assert client.get("/media/../main.py").status_code in (400, 404)


def test_export_transcript_and_summary(client):
    txt = client.get("/api/meetings/1/export?kind=transcript&format=txt")
    assert txt.status_code == 200 and "attachment" in txt.headers["content-disposition"]
    assert txt.text.splitlines()[2].startswith("[00:00] ")
    md = client.get("/api/meetings/1/export?kind=summary&format=md")
    assert md.text.startswith("# ") and "## Overview" in md.text and "## Action items" in md.text
    assert client.get("/api/meetings/1/export?kind=nope").status_code == 422
    assert client.get("/api/meetings/9999/export?kind=summary").status_code == 404


def test_tags_set_filter_and_list(client):
    m = new_meeting(client)
    r = client.put(f"/api/meetings/{m['id']}/tags", json={"tags": ["Pricing", " pricing ", "Q4"]})
    assert r.status_code == 200 and sorted(r.json()["tags"]) == ["pricing", "q4"]
    assert "pricing" in client.get(f"/api/meetings/{m['id']}").json()["tags"]
    listed = client.get("/api/meetings?tag=pricing").json()
    assert [x["id"] for x in listed["meetings"]] == [m["id"]]
    assert {"name": "pricing", "count": 1} in client.get("/api/tags").json()
    client.put(f"/api/meetings/{m['id']}/tags", json={"tags": []})
    assert client.get("/api/meetings?tag=pricing").json()["total"] == 0
    client.delete(f"/api/meetings/{m['id']}")


def test_comments_crud_and_cascade(client):
    m = new_meeting(client)
    seg = m["transcript_segments"][0]["id"]
    r = client.post(f"/api/meetings/{m['id']}/comments", json={"segment_id": seg, "text": "Check the numbers"})
    assert r.status_code == 201 and r.json()["author"]
    cid = r.json()["id"]
    assert [c["text"] for c in client.get(f"/api/meetings/{m['id']}/comments").json()] == ["Check the numbers"]
    assert client.post(f"/api/meetings/{m['id']}/comments", json={"segment_id": 10**9, "text": "x"}).status_code == 404
    assert client.post(f"/api/meetings/{m['id']}/comments", json={"segment_id": seg, "text": "  "}).status_code == 422
    assert client.delete(f"/api/meetings/{m['id']}/comments/{cid}").status_code == 204
    client.post(f"/api/meetings/{m['id']}/comments", json={"segment_id": seg, "text": "again"})
    client.delete(f"/api/meetings/{m['id']}")
    assert client.get(f"/api/meetings/{m['id']}/comments").status_code == 404


def test_soundbites_crud(client):
    m = new_meeting(client)
    r = client.post(f"/api/meetings/{m['id']}/soundbites", json={"title": "Pricing call", "start_time": 0, "end_time": 6})
    assert r.status_code == 201
    bad = client.post(f"/api/meetings/{m['id']}/soundbites", json={"title": "x", "start_time": 5, "end_time": 5})
    assert bad.status_code == 422
    assert [s["title"] for s in client.get("/api/soundbites").json() if s["meeting_id"] == m["id"]] == ["Pricing call"]
    assert client.delete(f"/api/meetings/{m['id']}/soundbites/{r.json()['id']}").status_code == 204
    client.delete(f"/api/meetings/{m['id']}")


def test_ask_returns_cited_transcript_lines(client):
    m = new_meeting(client)
    r = client.post(f"/api/meetings/{m['id']}/ask", json={"question": "What did they say about the budget?"})
    assert r.status_code == 200
    body = r.json()
    assert body["sources"] and "budget" in body["sources"][0]["text"].lower()
    assert body["answer"]
    nothing = client.post(f"/api/meetings/{m['id']}/ask", json={"question": "zebra xylophone"}).json()
    assert nothing["sources"] == []
    client.delete(f"/api/meetings/{m['id']}")


def test_datetimes_are_utc_with_explicit_zone(client):
    m = client.post("/api/meetings", data={"title": "tz", "date": "2026-10-06T10:00:00+05:30", "participants": '["A"]', "transcript_text": "A: hi"}).json()
    assert m["date"].startswith("2026-10-06T04:30:00") and m["date"].endswith("Z")
    assert m["created_at"].endswith("Z")
    renamed = client.put(f"/api/meetings/{m['id']}", json={"date": "2026-10-07T00:00:00+02:00"}).json()
    assert renamed["date"].startswith("2026-10-06T22:00:00") and renamed["date"].endswith("Z")
    assert client.get("/api/meetings/1").json()["date"].endswith("Z")
    client.delete(f"/api/meetings/{m['id']}")
