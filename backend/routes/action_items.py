from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.session import get_db
from models.meeting import Meeting
from models.action_item import ActionItem
from schemas.action_item import ActionItemCreate, ActionItemUpdate, ActionItemResponse

router = APIRouter(prefix="/api/meetings", tags=["action-items"])


@router.get("/{meeting_id}/action-items", response_model=List[ActionItemResponse])
def list_action_items(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).all()


@router.post("/{meeting_id}/action-items", response_model=ActionItemResponse, status_code=201)
def create_action_item(
    meeting_id: int,
    data: ActionItemCreate,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    item = ActionItem(meeting_id=meeting_id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{meeting_id}/action-items/{item_id}", response_model=ActionItemResponse)
def update_action_item(
    meeting_id: int,
    item_id: int,
    data: ActionItemUpdate,
    db: Session = Depends(get_db),
):
    item = (
        db.query(ActionItem)
        .filter(ActionItem.id == item_id, ActionItem.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{meeting_id}/action-items/{item_id}", status_code=204)
def delete_action_item(
    meeting_id: int,
    item_id: int,
    db: Session = Depends(get_db),
):
    item = (
        db.query(ActionItem)
        .filter(ActionItem.id == item_id, ActionItem.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    db.delete(item)
    db.commit()
