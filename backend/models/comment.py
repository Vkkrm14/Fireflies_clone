from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.session import Base


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (Index("idx_comments_meeting", "meeting_id"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    segment_id = Column(Integer, ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=False)
    author = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="comments")
