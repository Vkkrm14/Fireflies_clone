from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from database.session import Base


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (Index("idx_transcript_meeting", "meeting_id", "segment_index"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    speaker_name = Column(String, nullable=False)
    speaker_color = Column(String, nullable=True)     # hex color for speaker avatar
    start_time = Column(Float, nullable=False)        # seconds from start
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    segment_index = Column(Integer, nullable=False)   # ordering

    # Relationship
    meeting = relationship("Meeting", back_populates="transcript_segments")
