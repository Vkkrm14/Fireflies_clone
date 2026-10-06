from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.session import Base
from models.tag import meeting_tags


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (Index("idx_meetings_date", "date"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    duration = Column(Integer, nullable=False)        # seconds
    status = Column(String, default="completed")      # completed | in_progress
    media_url = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User", back_populates="meetings")
    participants = relationship("MeetingParticipant", back_populates="meeting", cascade="all, delete-orphan")
    transcript_segments = relationship(
        "TranscriptSegment", back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.segment_index"
    )
    summary = relationship("Summary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="meeting", cascade="all, delete-orphan")
    soundbites = relationship("Soundbite", back_populates="meeting", cascade="all, delete-orphan")
    tag_objs = relationship("Tag", secondary=meeting_tags, back_populates="meetings")

    @property
    def tags(self) -> list[str]:
        return sorted(t.name for t in self.tag_objs)


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"
    __table_args__ = (Index("idx_participants_meeting", "meeting_id"), Index("idx_participants_name", "name"))

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    role = Column(String, default="participant")       # host | participant
    avatar_color = Column(String, nullable=True)      # hex color for avatar fallback

    # Relationships
    meeting = relationship("Meeting", back_populates="participants")
