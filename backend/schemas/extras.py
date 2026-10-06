from typing import List

from pydantic import BaseModel, Field, field_validator, model_validator
from schemas.common import UtcDatetime

MAX_TAGS, MAX_TAG_LENGTH = 20, 40
MAX_SECONDS = 24 * 3600


class TagsUpdate(BaseModel):
    tags: List[str] = Field(max_length=MAX_TAGS)

    @field_validator("tags")
    @classmethod
    def normalise(cls, value: List[str]) -> List[str]:
        if any(len(t.strip()) > MAX_TAG_LENGTH for t in value):
            raise ValueError(f"tags are limited to {MAX_TAG_LENGTH} characters")
        return sorted({t.strip().lower() for t in value if t.strip()})


class TagCount(BaseModel):
    name: str
    count: int


class TagsResponse(BaseModel):
    tags: List[str]


class CommentCreate(BaseModel):
    segment_id: int
    text: str = Field(max_length=2000)

    @field_validator("text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Comment text is required")
        return value.strip()


class CommentResponse(BaseModel):
    id: int
    meeting_id: int
    segment_id: int
    author: str
    text: str
    created_at: UtcDatetime

    model_config = {"from_attributes": True}


class SoundbiteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    start_time: float = Field(ge=0, le=MAX_SECONDS)
    end_time: float = Field(le=MAX_SECONDS)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("title must not be blank")
        return value.strip()

    @model_validator(mode="after")
    def ordered(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class SoundbiteResponse(BaseModel):
    id: int
    meeting_id: int
    title: str
    start_time: float
    end_time: float
    created_at: UtcDatetime

    model_config = {"from_attributes": True}


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)

    @field_validator("question")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("question must not be blank")
        return value.strip()


class AskSource(BaseModel):
    segment_id: int
    speaker_name: str
    start_time: float
    text: str


class AskResponse(BaseModel):
    answer: str
    sources: List[AskSource]
