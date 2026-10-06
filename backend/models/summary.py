from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.session import Base


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True)
    overview = Column(Text, nullable=False)
    key_topics = Column(Text, nullable=True)   # JSON array: ["topic1", "topic2", ...]
    chapters = Column(Text, nullable=True)     # JSON array: [{"title": "...", "start_time": 0.0}, ...]
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    meeting = relationship("Meeting", back_populates="summary")
