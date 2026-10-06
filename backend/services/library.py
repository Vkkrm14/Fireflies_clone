"""Write-side helpers shared by several routes: summary upsert, transcript replacement, tag pruning."""
import json
import math
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.meeting import Meeting
from models.summary import Summary
from models.tag import Tag, meeting_tags
from models.transcript import TranscriptSegment
from services.summary_generator import generate_meeting_summary


def refresh_summary(db: Session, meeting: Meeting) -> Summary:
    """Create or regenerate the meeting's template summary from its current transcript."""
    data = generate_meeting_summary(meeting)
    summary = meeting.summary
    if summary is None:
        summary = Summary(meeting_id=meeting.id)
        db.add(summary)
    summary.overview = data["overview"]
    summary.key_topics = json.dumps(data["key_topics"])
    summary.chapters = json.dumps(data["chapters"])
    summary.generated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    return summary


def duration_from_segments(segments) -> int:
    return int(math.ceil(max(s.end_time for s in segments)))


def replace_transcript(db: Session, meeting: Meeting, segments: list[TranscriptSegment]) -> None:
    """Swap in a new transcript. Comments hang off the old lines, so they go with them (FK cascade)."""
    db.query(TranscriptSegment).filter(TranscriptSegment.meeting_id == meeting.id).delete(synchronize_session=False)
    db.expire(meeting, ["transcript_segments", "comments"])
    db.add_all(segments)
    meeting.duration = duration_from_segments(segments)
    db.flush()
    db.expire(meeting, ["transcript_segments", "comments"])
    refresh_summary(db, meeting)


def prune_orphan_tags(db: Session) -> None:
    db.query(Tag).filter(~Tag.id.in_(db.query(meeting_tags.c.tag_id))).delete(synchronize_session=False)
