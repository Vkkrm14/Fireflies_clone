from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from database.session import get_db
from models.meeting import Meeting
from models.summary import Summary
from models.transcript import TranscriptSegment
from schemas.common import to_iso_z
from services.search_utils import clean_query, contains

router = APIRouter(prefix="/api", tags=["search"])

MEETING_CAP, SUMMARY_CAP, SEGMENT_CAP = 5, 5, 10


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    """Global search across meeting titles, transcripts, and summaries.

    `results` is capped per kind; `total` is the real number of hits, so a client can say "showing 20 of 134".
    """
    q = clean_query(q)
    q_lower = q.lower()
    results = []

    title_hits = db.query(Meeting).filter(contains(Meeting.title, q))
    summary_hits = db.query(Summary).options(joinedload(Summary.meeting)).filter(contains(Summary.overview, q))
    segment_hits = db.query(TranscriptSegment).options(joinedload(TranscriptSegment.meeting)).filter(
        contains(TranscriptSegment.text, q)
    )
    total = title_hits.count() + summary_hits.count() + segment_hits.count()

    for m in title_hits.order_by(Meeting.date.desc()).limit(MEETING_CAP).all():
        results.append({
            "type": "meeting",
            "meeting_id": m.id,
            "meeting_title": m.title,
            "date": to_iso_z(m.date),
            "snippet": m.title,
        })

    for sm in summary_hits.limit(SUMMARY_CAP).all():
        i = max(sm.overview.lower().find(q_lower), 0)
        start = max(i - 60, 0)
        results.append({
            "type": "summary",
            "meeting_id": sm.meeting_id,
            "meeting_title": sm.meeting.title,
            "date": to_iso_z(sm.meeting.date),
            "snippet": ("..." if start else "") + sm.overview[start:start + 160],
        })

    ordered = segment_hits.order_by(TranscriptSegment.meeting_id, TranscriptSegment.segment_index)
    for seg in ordered.limit(SEGMENT_CAP).all():
        results.append({
            "type": "transcript",
            "meeting_id": seg.meeting_id,
            "meeting_title": seg.meeting.title if seg.meeting else "",
            "date": to_iso_z(seg.meeting.date) if seg.meeting else None,
            "snippet": seg.text[:150],
            "start_time": seg.start_time,
            "speaker_name": seg.speaker_name,
        })

    return {"query": q, "results": results, "total": total}
