from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.session import get_db
from models.meeting import Meeting
from schemas.summary import SummaryResponse
from services.library import refresh_summary

router = APIRouter(prefix="/api/meetings", tags=["summary"])


@router.get("/{meeting_id}/summary", response_model=SummaryResponse)
def get_summary(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not meeting.summary:
        raise HTTPException(status_code=404, detail="Summary not found for this meeting")
    return meeting.summary


@router.post("/{meeting_id}/summary/generate", response_model=SummaryResponse, status_code=201)
def generate_summary(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.transcript_segments:
        raise HTTPException(status_code=400, detail="Meeting has no transcript to summarize")

    summary = refresh_summary(db, meeting)
    db.commit()
    db.refresh(summary)
    return summary
