from pydantic import BaseModel
from typing import Optional


class TranscriptSegmentBase(BaseModel):
    speaker_name: str
    speaker_color: Optional[str] = None
    start_time: float
    end_time: float
    text: str
    segment_index: int


class TranscriptSegmentCreate(TranscriptSegmentBase):
    meeting_id: int


class TranscriptSegmentResponse(TranscriptSegmentBase):
    id: int
    meeting_id: int

    model_config = {"from_attributes": True}


class TranscriptSearchResult(BaseModel):
    segment: TranscriptSegmentResponse
    match_positions: list[int] = []   # character offsets of matches in text
