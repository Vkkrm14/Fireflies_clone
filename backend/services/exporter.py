"""Plain-text, Markdown and JSON renderings of a meeting's transcript and summary."""
import json
import re
import unicodedata
from typing import Any
from urllib.parse import quote

MAX_STEM = 100


def _ts(seconds: float) -> str:
    s = int(max(seconds, 0))
    h, m, sec = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"


def safe_filename(title: str, ext: str) -> str:
    stem = re.sub(r"[^\w\- ]+", "", title).strip().replace(" ", "-")[:MAX_STEM] or "meeting"
    return f"{stem}.{ext}"


def content_disposition(filename: str) -> str:
    """Header safe for any title: an ASCII `filename` fallback plus the real name as RFC 5987 `filename*`."""
    ext = filename.rsplit(".", 1)[-1]
    ascii_stem = unicodedata.normalize("NFKD", filename.rsplit(".", 1)[0]).encode("ascii", "ignore").decode()
    ascii_stem = re.sub(r"[^A-Za-z0-9_-]+", "-", ascii_stem).strip("-") or "meeting"
    return f'attachment; filename="{ascii_stem}.{ext}"; filename*=UTF-8\'\'{quote(filename, safe="")}'


def transcript_data(meeting) -> list[dict[str, Any]]:
    return [
        {"speaker": s.speaker_name, "start_time": s.start_time, "end_time": s.end_time, "text": s.text}
        for s in meeting.transcript_segments
    ]


def summary_data(meeting) -> dict[str, Any]:
    summary = meeting.summary
    return {
        "title": meeting.title,
        "date": meeting.date.isoformat(),
        "overview": summary.overview if summary else "",
        "key_topics": json.loads(summary.key_topics) if summary and summary.key_topics else [],
        "chapters": json.loads(summary.chapters) if summary and summary.chapters else [],
        "action_items": [
            {"text": a.text, "assignee": a.assignee, "is_completed": a.is_completed} for a in meeting.action_items
        ],
    }


def render_transcript(meeting, fmt: str) -> str:
    rows = transcript_data(meeting)
    if fmt == "json":
        return json.dumps(rows, indent=2)
    if fmt == "md":
        lines = [f"# {meeting.title}", ""]
        lines += [f"**{r['speaker']}** ({_ts(r['start_time'])}): {r['text']}\n" for r in rows]
        return "\n".join(lines)
    lines = [meeting.title, ""]
    lines += [f"[{_ts(r['start_time'])}] {r['speaker']}: {r['text']}" for r in rows]
    return "\n".join(lines) + "\n"


def render_summary(meeting, fmt: str) -> str:
    data = summary_data(meeting)
    if fmt == "json":
        return json.dumps(data, indent=2)
    if fmt == "md":
        out = [f"# {data['title']}", "", "## Overview", "", data["overview"], ""]
        if data["key_topics"]:
            out += ["## Key topics", ""] + [f"- {t}" for t in data["key_topics"]] + [""]
        if data["chapters"]:
            out += ["## Chapters", ""] + [f"- {c['title']} ({_ts(c['start_time'])})" for c in data["chapters"]] + [""]
        out += ["## Action items", ""]
        out += [
            f"- [{'x' if a['is_completed'] else ' '}] {a['text']}" + (f" ({a['assignee']})" if a["assignee"] else "")
            for a in data["action_items"]
        ]
        return "\n".join(out) + "\n"
    out = [data["title"], "", data["overview"], ""]
    out += [f"- {a['text']}" for a in data["action_items"]]
    return "\n".join(out) + "\n"
