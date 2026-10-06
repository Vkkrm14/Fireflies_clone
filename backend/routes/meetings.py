from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from typing import Literal, Optional
from datetime import datetime, timedelta
import json

from database.session import get_db
from models.meeting import Meeting, MeetingParticipant
from models.tag import Tag
from schemas.common import to_naive_utc
from schemas.meeting import (
    MAX_DURATION, MeetingUpdate, MeetingDetail, MeetingsListResponse,
    clean_participants, clean_title,
)
from services.library import duration_from_segments, prune_orphan_tags, refresh_summary
from services.search_utils import contains
from services.transcript_parser import MAX_UPLOAD_BYTES, TranscriptError, parse_transcript_text, parse_upload

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

COLORS = ["#6c5ce7", "#00b894", "#0984e3", "#e17055", "#fdcb6e", "#e84393"]


def _meeting_to_list_item(meeting: Meeting) -> dict:
    """Convert a Meeting ORM object to a MeetingListItem dict."""
    snippet = None
    if meeting.summary:
        snippet = (meeting.summary.overview or "")[:150]

    total_items = len(meeting.action_items) if meeting.action_items else 0
    completed_items = sum(1 for a in meeting.action_items if a.is_completed) if meeting.action_items else 0

    return {
        "id": meeting.id,
        "title": meeting.title,
        "date": meeting.date,
        "duration": meeting.duration,
        "status": meeting.status,
        "media_url": meeting.media_url,
        "created_at": meeting.created_at,
        "updated_at": meeting.updated_at,
        "participants": meeting.participants or [],
        "tags": meeting.tags,
        "summary_snippet": snippet,
        "action_items_count": total_items,
        "completed_action_items_count": completed_items,
    }


def _date_bound(value: Optional[str], name: str, end_of_day: bool = False) -> Optional[datetime]:
    """Parse a filter bound. A bare date used as the upper bound means 'through the end of that day'."""
    if not value or not value.strip():
        return None
    try:
        bound = to_naive_utc(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"{name} must be an ISO date or datetime")
    if not isinstance(bound, datetime):
        raise HTTPException(status_code=422, detail=f"{name} must be an ISO date or datetime")
    if end_of_day and len(value.strip()) == 10:
        bound += timedelta(days=1) - timedelta(microseconds=1)
    return bound


@router.get("", response_model=MeetingsListResponse)
def list_meetings(
    search: Optional[str] = Query(None),
    sort: Literal["newest", "oldest", "longest", "shortest"] = Query("newest"),
    participant: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Meeting).options(
        selectinload(Meeting.participants),
        selectinload(Meeting.summary),
        selectinload(Meeting.action_items),
        selectinload(Meeting.tag_objs),
    )

    if search and search.strip():
        query = query.filter(contains(Meeting.title, search.strip()))

    lower = _date_bound(date_from, "date_from")
    upper = _date_bound(date_to, "date_to", end_of_day=True)
    if lower:
        query = query.filter(Meeting.date >= lower)
    if upper:
        query = query.filter(Meeting.date <= upper)

    if participant and participant.strip():
        query = query.filter(Meeting.participants.any(contains(MeetingParticipant.name, participant.strip())))

    if tag and tag.strip():
        query = query.filter(Meeting.tag_objs.any(Tag.name == tag.strip().lower()))

    # Sorting (id breaks ties so pages never overlap)
    if sort == "oldest":
        query = query.order_by(Meeting.date.asc(), Meeting.id.asc())
    elif sort == "longest":
        query = query.order_by(Meeting.duration.desc(), Meeting.id.desc())
    elif sort == "shortest":
        query = query.order_by(Meeting.duration.asc(), Meeting.id.asc())
    else:
        query = query.order_by(Meeting.date.desc(), Meeting.id.desc())

    total = query.order_by(None).count()
    meetings = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "meetings": [_meeting_to_list_item(m) for m in meetings],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=422, detail=detail)


@router.post("", response_model=MeetingDetail, status_code=201)
def create_meeting(
    title: str = Form(..., max_length=300),
    date: str = Form(...),
    duration: Optional[int] = Form(None, ge=0, le=MAX_DURATION),   # seconds; derived from the transcript when omitted
    participants: str = Form("[]"),   # JSON array of names
    status: Literal["completed", "in_progress"] = Form("completed"),
    media_url: Optional[str] = Form(None, max_length=500),
    transcript_file: Optional[UploadFile] = File(None),
    transcript_text: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # Validate everything before touching the database
    try:
        clean = clean_title(title)
        meeting_date = to_naive_utc(date)
        names = clean_participants(json.loads(participants) if participants else [])
    except ValueError as exc:   # includes json.JSONDecodeError
        raise _bad_request(f"Invalid title, date or participants: {exc}")
    if not isinstance(meeting_date, datetime):
        raise _bad_request("date must be an ISO date or datetime")

    db_meeting = Meeting(
        title=clean,
        date=meeting_date,
        duration=duration or 0,
        status=status,
        media_url=media_url or None,
        created_by=1,  # default user
    )
    db.add(db_meeting)
    db.flush()  # get id

    for i, name in enumerate(names):
        db.add(MeetingParticipant(
            meeting_id=db_meeting.id,
            name=name,
            role="host" if i == 0 else "participant",
            avatar_color=COLORS[i % len(COLORS)],
        ))

    segments = []
    try:
        if transcript_file and transcript_file.filename:
            raw = transcript_file.file.read(MAX_UPLOAD_BYTES + 1)
            if len(raw) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="File is too large (limit 5 MB)")
            segments = parse_upload(raw, transcript_file.filename, db_meeting.id)
        elif transcript_text:
            segments = parse_transcript_text(transcript_text, db_meeting.id)
            if not segments:
                raise TranscriptError("No transcript lines were found in the pasted text")
    except TranscriptError as exc:
        db.rollback()
        raise _bad_request(f"Could not parse transcript: {exc}")
    except HTTPException:
        db.rollback()
        raise
    db.add_all(segments)

    if segments and not db_meeting.duration:
        db_meeting.duration = duration_from_segments(segments)

    try:
        db.flush()
        db.refresh(db_meeting)
        if segments:
            refresh_summary(db, db_meeting)   # template summary so new meetings are not empty
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _bad_request("The meeting could not be saved: the data conflicts with existing records")
    db.refresh(db_meeting)
    return db_meeting


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.put("/{meeting_id}", response_model=MeetingDetail)
def update_meeting(meeting_id: int, data: MeetingUpdate, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "participants":
            # Replace participants
            db.query(MeetingParticipant).filter(MeetingParticipant.meeting_id == meeting_id).delete()
            for i, name in enumerate(value):
                db.add(MeetingParticipant(
                    meeting_id=meeting_id,
                    name=name,
                    role="host" if i == 0 else "participant",
                    avatar_color=COLORS[i % len(COLORS)],
                ))
        elif field == "date":
            # model_dump() serialises datetimes to ISO strings; store naive UTC
            setattr(meeting, field, to_naive_utc(value))
        else:
            setattr(meeting, field, value)

    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting)
    db.flush()
    prune_orphan_tags(db)
    db.commit()
