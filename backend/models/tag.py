from sqlalchemy import Column, ForeignKey, Index, Integer, String, Table
from sqlalchemy.orm import relationship
from database.session import Base

# Junction table: a meeting has many tags, a tag spans many meetings
meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", Integer, ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    Index("idx_meeting_tags_tag", "tag_id"),
)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)   # stored lower-case

    meetings = relationship("Meeting", secondary=meeting_tags, back_populates="tag_objs")
