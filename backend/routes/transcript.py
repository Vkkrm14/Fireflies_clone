from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from database.session import get_db
from models.meeting import Meeting
from models.transcript import TranscriptSegment
from schemas.transcript import TranscriptSegmentResponse, TranscriptSearchResult
from services.library import replace_transcript
from services.search_utils import clean_query, contains
from services.transcript_parser import MAX_UPLOAD_BYTES, TranscriptError, parse_upload

router = APIRouter(prefix="/api/meetings", tags=["transcript"])


def _segments(db: Session, meeting_id: int):
    return (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.segment_index)
        .all()
    )


@router.get("/{meeting_id}/transcript", response_model=List[TranscriptSegmentResponse])
def get_transcript(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _segments(db, meeting_id)


@router.post("/{meeting_id}/transcript", response_model=List[TranscriptSegmentResponse], status_code=201)
def upload_transcript(
    meeting_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Replace the meeting's transcript. The old one is only removed once the new file parsed cleanly."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (limit 5 MB)")
    try:
        segments = parse_upload(raw, file.filename or "", meeting_id)
    except TranscriptError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    replace_transcript(db, meeting, segments)
    db.commit()
    return _segments(db, meeting_id)


@router.get("/{meeting_id}/transcript/search", response_model=List[TranscriptSearchResult])
def search_transcript(
    meeting_id: int,
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    q = clean_query(q)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting_id, contains(TranscriptSegment.text, q))
        .order_by(TranscriptSegment.segment_index)
        .all()
    )

    results = []
    q_lower = q.lower()
    for seg in segments:
        text_lower = seg.text.lower()
        positions = []
        start = 0
        while True:
            idx = text_lower.find(q_lower, start)
            if idx == -1:
                break
            positions.append(idx)
            start = idx + 1
        results.append({"segment": seg, "match_positions": positions})

    return results
