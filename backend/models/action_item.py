from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.session import Base


class ActionItem(Base):
    __tablename__ = "action_items"
    __table_args__ = (Index("idx_action_items_meeting", "meeting_id"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    assignee = Column(String, nullable=True)
    is_completed = Column(Boolean, default=False)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    meeting = relationship("Meeting", back_populates="action_items")
