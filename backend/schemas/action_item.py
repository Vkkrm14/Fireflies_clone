from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional
from schemas.common import UtcDatetime


def _clean_text(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("text must not be blank")
    return value


class ActionItemBase(BaseModel):
    text: str = Field(max_length=2000)
    assignee: Optional[str] = Field(default=None, max_length=100)
    is_completed: bool = False
    due_date: Optional[date] = None

    _strip_text = field_validator("text")(_clean_text)


class ActionItemCreate(ActionItemBase):
    pass


class ActionItemUpdate(BaseModel):
    """Fields may be omitted, but `text` and `is_completed` can never be set to null."""
    text: Optional[str] = Field(default=None, max_length=2000)
    assignee: Optional[str] = Field(default=None, max_length=100)
    is_completed: Optional[bool] = None
    due_date: Optional[date] = None

    @field_validator("text")
    @classmethod
    def text_not_null_or_blank(cls, value):
        if value is None:
            raise ValueError("text must not be null")
        return _clean_text(value)

    @field_validator("is_completed")
    @classmethod
    def completed_not_null(cls, value):
        if value is None:
            raise ValueError("is_completed must not be null")
        return value


class ActionItemResponse(ActionItemBase):
    id: int
    meeting_id: int
    created_at: UtcDatetime

    model_config = {"from_attributes": True}
