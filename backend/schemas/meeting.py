from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional, List
from schemas.transcript import TranscriptSegmentResponse
from schemas.summary import SummaryResponse
from schemas.action_item import ActionItemResponse
from schemas.common import UtcDatetime


class ParticipantBase(BaseModel):
    name: str
    role: str = "participant"
    avatar_color: Optional[str] = None


class ParticipantCreate(ParticipantBase):
    pass


class ParticipantResponse(ParticipantBase):
    id: int
    meeting_id: int
    user_id: Optional[int] = None

    model_config = {"from_attributes": True}


class MeetingBase(BaseModel):
    title: str
    date: UtcDatetime
    duration: int           # seconds
    status: str = "completed"
    media_url: Optional[str] = None


class MeetingCreate(MeetingBase):
    participants: List[str] = []  # list of participant names


MAX_DURATION = 7 * 24 * 3600
MAX_PARTICIPANTS = 100
MeetingStatus = Literal["completed", "in_progress"]


def clean_title(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("title must not be blank")
    return value


def clean_participants(names) -> List[str]:
    """Strip names; blanks, over-long names and huge lists are client errors."""
    if not isinstance(names, list) or len(names) > MAX_PARTICIPANTS:
        raise ValueError(f"participants must be a list of at most {MAX_PARTICIPANTS} names")
    cleaned = []
    for name in names:
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
            raise ValueError("each participant must be a non-empty name of at most 100 characters")
        cleaned.append(name.strip())
    return cleaned


class MeetingUpdate(BaseModel):
    """Fields may be omitted, but none of them can be set to null (the columns are NOT NULL)."""
    title: Optional[str] = Field(default=None, max_length=300)
    date: Optional[UtcDatetime] = None
    duration: Optional[int] = Field(default=None, ge=0, le=MAX_DURATION)
    status: Optional[MeetingStatus] = None
    media_url: Optional[str] = Field(default=None, max_length=500)
    participants: Optional[List[str]] = None

    @field_validator("title", "date", "duration", "status", "participants")
    @classmethod
    def not_null(cls, value, info):
        if value is None:
            raise ValueError(f"{info.field_name} must not be null")
        return value

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value):
        return clean_title(value)

    @field_validator("participants")
    @classmethod
    def participants_clean(cls, value):
        return clean_participants(value)


class MeetingListItem(MeetingBase):
    id: int
    created_at: UtcDatetime
    updated_at: UtcDatetime
    participants: List[ParticipantResponse] = []
    tags: List[str] = []
    summary_snippet: Optional[str] = None   # first ~120 chars of overview
    action_items_count: int = 0
    completed_action_items_count: int = 0

    model_config = {"from_attributes": True}


class MeetingDetail(MeetingBase):
    id: int
    created_at: UtcDatetime
    updated_at: UtcDatetime
    participants: List[ParticipantResponse] = []
    tags: List[str] = []
    transcript_segments: List[TranscriptSegmentResponse] = []
    summary: Optional[SummaryResponse] = None
    action_items: List[ActionItemResponse] = []

    model_config = {"from_attributes": True}


class MeetingsListResponse(BaseModel):
    meetings: List[MeetingListItem]
    total: int
    page: int
    page_size: int
