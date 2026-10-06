import json
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List, Any
from schemas.common import UtcDatetime


class ChapterItem(BaseModel):
    title: str
    start_time: float


class SummaryBase(BaseModel):
    overview: str
    key_topics: Optional[List[str]] = None
    chapters: Optional[List[ChapterItem]] = None


class SummaryCreate(SummaryBase):
    meeting_id: int


class SummaryResponse(BaseModel):
    id: int
    meeting_id: int
    overview: str
    key_topics: Optional[List[str]] = None
    chapters: Optional[List[ChapterItem]] = None
    generated_at: UtcDatetime

    model_config = {"from_attributes": True}

    @field_validator("key_topics", "chapters", mode="before")
    @classmethod
    def _decode_json_column(cls, value):
        """The ORM stores these as JSON text; decode so nested responses (MeetingDetail) work."""
        if isinstance(value, str):
            return json.loads(value)
        return value
