"""Bonus features: export, tags, transcript comments, soundbites, and ask-about-this-meeting."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.session import get_db
from models.comment import Comment
from models.meeting import Meeting
from models.soundbite import Soundbite
from models.tag import Tag, meeting_tags
from models.transcript import TranscriptSegment
from schemas.extras import (
    AskRequest, AskResponse, CommentCreate, CommentResponse, SoundbiteCreate, SoundbiteResponse,
    TagCount, TagsResponse, TagsUpdate,
)
from services import exporter
from services.library import prune_orphan_tags
from services.qa import answer_question

router = APIRouter(prefix="/api", tags=["extras"])

CURRENT_USER_NAME = "Alex Johnson"  # default logged-in user (no auth in this build)
MEDIA_TYPES = {"txt": "text/plain", "md": "text/markdown", "json": "application/json"}


def _meeting_or_404(db: Session, meeting_id: int) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


# --- export -----------------------------------------------------------------

@router.get("/meetings/{meeting_id}/export")
def export_meeting(
    meeting_id: int,
    kind: str = Query("transcript"),
    format: str = Query("txt"),
    db: Session = Depends(get_db),
):
    if kind not in ("transcript", "summary") or format not in MEDIA_TYPES:
        raise HTTPException(status_code=422, detail="kind must be transcript|summary and format txt|md|json")
    meeting = _meeting_or_404(db, meeting_id)
    body = exporter.render_transcript(meeting, format) if kind == "transcript" else exporter.render_summary(meeting, format)
    filename = exporter.safe_filename(f"{meeting.title} {kind}", format)
    return Response(
        content=body,
        media_type=f"{MEDIA_TYPES[format]}; charset=utf-8",
        headers={"Content-Disposition": exporter.content_disposition(filename)},
    )


# --- tags -------------------------------------------------------------------

@router.get("/tags", response_model=List[TagCount])
def list_tags(db: Session = Depends(get_db)):
    rows = (
        db.query(Tag.name, func.count(meeting_tags.c.meeting_id))
        .join(meeting_tags, meeting_tags.c.tag_id == Tag.id)
        .group_by(Tag.id)
        .order_by(Tag.name)
        .all()
    )
    return [{"name": name, "count": count} for name, count in rows]


@router.put("/meetings/{meeting_id}/tags", response_model=TagsResponse)
def set_tags(meeting_id: int, data: TagsUpdate, db: Session = Depends(get_db)):
    meeting = _meeting_or_404(db, meeting_id)
    existing = {t.name: t for t in db.query(Tag).filter(Tag.name.in_(data.tags)).all()} if data.tags else {}
    for name in data.tags:
        if name not in existing:
            existing[name] = Tag(name=name)
    meeting.tag_objs = [existing[name] for name in data.tags]
    db.flush()
    prune_orphan_tags(db)   # drop tags no meeting uses any more
    db.commit()
    db.refresh(meeting)
    return {"tags": meeting.tags}


# --- comments ---------------------------------------------------------------

@router.get("/meetings/{meeting_id}/comments", response_model=List[CommentResponse])
def list_comments(meeting_id: int, db: Session = Depends(get_db)):
    _meeting_or_404(db, meeting_id)
    return db.query(Comment).filter(Comment.meeting_id == meeting_id).order_by(Comment.created_at, Comment.id).all()


@router.post("/meetings/{meeting_id}/comments", response_model=CommentResponse, status_code=201)
def add_comment(meeting_id: int, data: CommentCreate, db: Session = Depends(get_db)):
    _meeting_or_404(db, meeting_id)
    segment = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.id == data.segment_id, TranscriptSegment.meeting_id == meeting_id)
        .first()
    )
    if not segment:
        raise HTTPException(status_code=404, detail="Transcript segment not found in this meeting")
    comment = Comment(meeting_id=meeting_id, segment_id=segment.id, author=CURRENT_USER_NAME, text=data.text)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/meetings/{meeting_id}/comments/{comment_id}", status_code=204)
def delete_comment(meeting_id: int, comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.meeting_id == meeting_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()


# --- soundbites -------------------------------------------------------------

@router.get("/soundbites", response_model=List[SoundbiteResponse])
def list_all_soundbites(db: Session = Depends(get_db)):
    return db.query(Soundbite).order_by(Soundbite.created_at.desc(), Soundbite.id.desc()).all()


@router.get("/meetings/{meeting_id}/soundbites", response_model=List[SoundbiteResponse])
def list_soundbites(meeting_id: int, db: Session = Depends(get_db)):
    _meeting_or_404(db, meeting_id)
    return db.query(Soundbite).filter(Soundbite.meeting_id == meeting_id).order_by(Soundbite.start_time).all()


@router.post("/meetings/{meeting_id}/soundbites", response_model=SoundbiteResponse, status_code=201)
def add_soundbite(meeting_id: int, data: SoundbiteCreate, db: Session = Depends(get_db)):
    meeting = _meeting_or_404(db, meeting_id)
    if meeting.duration and data.start_time >= meeting.duration:
        raise HTTPException(status_code=422, detail="start_time is beyond the end of the meeting")
    bite = Soundbite(meeting_id=meeting_id, **data.model_dump())
    db.add(bite)
    db.commit()
    db.refresh(bite)
    return bite


@router.delete("/meetings/{meeting_id}/soundbites/{soundbite_id}", status_code=204)
def delete_soundbite(meeting_id: int, soundbite_id: int, db: Session = Depends(get_db)):
    bite = db.query(Soundbite).filter(Soundbite.id == soundbite_id, Soundbite.meeting_id == meeting_id).first()
    if not bite:
        raise HTTPException(status_code=404, detail="Soundbite not found")
    db.delete(bite)
    db.commit()


# --- ask --------------------------------------------------------------------

@router.post("/meetings/{meeting_id}/ask", response_model=AskResponse)
def ask(meeting_id: int, data: AskRequest, db: Session = Depends(get_db)):
    meeting = _meeting_or_404(db, meeting_id)
    return answer_question(data.question, meeting.transcript_segments)
