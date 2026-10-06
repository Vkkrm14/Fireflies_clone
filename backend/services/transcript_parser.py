"""
Transcript parser service.
Supports parsing .txt, .vtt, and .json transcript formats.
Anything that cannot be turned into valid segments raises TranscriptError, which routes report as HTTP 422.
"""
import json
import math
import re
from typing import List
from models.transcript import TranscriptSegment

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = (".txt", ".vtt", ".json")
MAX_SECONDS = 1_000_000          # ~11 days; anything beyond is a typo, not a meeting
MAX_SPEAKER_LENGTH = 100

SPEAKER_COLORS = [
    "#6c5ce7",  # purple
    "#00b894",  # green
    "#0984e3",  # blue
    "#e17055",  # orange-red
    "#fdcb6e",  # yellow
    "#e84393",  # pink
    "#00cec9",  # teal
    "#a29bfe",  # lavender
]


class TranscriptError(ValueError):
    """The transcript could not be understood; the message is safe to show to the user."""


def _seconds(value, label: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise TranscriptError(f"{label} must be a number, got {value!r}")
    if not math.isfinite(number) or number < 0 or number > MAX_SECONDS:
        raise TranscriptError(f"{label} is out of range: {value!r}")
    return number


def _reject_constant(name: str):
    raise TranscriptError(f"{name} is not allowed in a transcript")


def _assign_speaker_colors(segments: List[dict]) -> dict:
    """Assign a consistent color to each unique speaker name."""
    speakers = {}
    for seg in segments:
        name = seg.get("speaker_name", "Unknown")
        if name not in speakers:
            speakers[name] = SPEAKER_COLORS[len(speakers) % len(SPEAKER_COLORS)]
    return speakers


def _build_segments(raw_segs: List[dict], meeting_id: int) -> List[TranscriptSegment]:
    speaker_colors = _assign_speaker_colors(raw_segs)
    return [
        TranscriptSegment(
            meeting_id=meeting_id,
            speaker_name=seg["speaker_name"],
            speaker_color=speaker_colors.get(seg["speaker_name"]),
            start_time=seg["start_time"],
            end_time=max(seg["end_time"], seg["start_time"]),
            text=seg["text"],
            segment_index=idx,
        )
        for idx, seg in enumerate(raw_segs)
    ]


def _vtt_time_to_seconds(time_str: str) -> float:
    """Convert VTT timestamp (HH:MM:SS.mmm or MM:SS.mmm) to seconds."""
    parts = time_str.strip().split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return 0.0


VTT_TIMING = re.compile(
    r"((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})"
)
VTT_VOICE_TAG = re.compile(r"^<v(?:\.[^\s>]+)?\s+([^>]+)>(.*?)(?:</v>)?$", re.DOTALL)
VTT_SPEAKER_PREFIX = re.compile(r"^([A-Za-z][A-Za-z\s\-']{0,40}):\s+(.+)$")


def parse_vtt(content: str, meeting_id: int) -> List[TranscriptSegment]:
    """Parse WebVTT (.vtt): HH:MM:SS.mmm or MM:SS.mmm cues, `<v Name>` voice tags or `Name:` prefixes."""
    lines = content.lstrip("﻿").splitlines()
    raw_segs = []
    i = 0

    while i < len(lines):
        timing = VTT_TIMING.search(lines[i])
        if not timing:
            i += 1
            continue

        start = _vtt_time_to_seconds(timing.group(1).replace(",", "."))
        end = _vtt_time_to_seconds(timing.group(2).replace(",", "."))
        i += 1
        text_lines = []
        while i < len(lines) and lines[i].strip():
            text_lines.append(lines[i].strip())
            i += 1
        full_text = " ".join(text_lines)

        voice = VTT_VOICE_TAG.match(full_text)
        prefix = VTT_SPEAKER_PREFIX.match(full_text)
        if voice:
            speaker, text = voice.group(1).strip(), voice.group(2).strip()
        elif prefix:
            speaker, text = prefix.group(1).strip(), prefix.group(2).strip()
        else:
            speaker, text = "Speaker", full_text
        text = re.sub(r"<[^>]+>", "", text).strip()
        if text:
            raw_segs.append({
                "speaker_name": speaker[:MAX_SPEAKER_LENGTH] or "Speaker",
                "start_time": _seconds(start, "start time"),
                "end_time": _seconds(end, "end time"),
                "text": text,
            })

    return _build_segments(raw_segs, meeting_id)


TXT_TIMESTAMP = re.compile(r"^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)$")
# "Name: text" or "Name (00:05): text"; names may hold digits, dots and accents ("Dr. Smith", "Speaker 1", "Élodie")
TXT_SPEAKER = re.compile(
    r"^(?P<name>[^\W_][\w.'\- ]{0,40}?)(?:\s*[(\[](?P<ts>\d{1,2}:\d{2}(?::\d{2})?)[)\]])?\s*:\s+(?P<text>.+)$"
)


def _clock_to_seconds(stamp: str) -> float:
    parts = stamp.split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    return int(parts[0]) * 60 + float(parts[1])


def parse_txt(content: str, meeting_id: int) -> List[TranscriptSegment]:
    """
    Parse a plain-text transcript. Accepted line shapes (all optional parts may be mixed):
      [00:00] Speaker Name: Text
      Speaker Name (00:00): Text
      Speaker Name: Text
      just text
    Lines without a timestamp continue from the end of the previous line.
    """
    raw_segs = []
    current_time = 0.0

    for line in content.splitlines():
        line = line.strip().lstrip("﻿")
        if not line:
            continue

        ts_match = TXT_TIMESTAMP.match(line)
        if ts_match:
            current_time = _clock_to_seconds(ts_match.group(1))
            line = ts_match.group(2).strip()
            if not line:
                continue

        speaker, text = "Speaker", line
        sp_match = TXT_SPEAKER.match(line)
        if sp_match and len(sp_match.group("name").split()) <= 4:
            speaker, text = sp_match.group("name").strip(), sp_match.group("text").strip()
            if sp_match.group("ts"):
                current_time = _clock_to_seconds(sp_match.group("ts"))

        current_time = _seconds(current_time, "timestamp")
        raw_segs.append({
            "speaker_name": speaker,
            "start_time": current_time,
            "end_time": current_time + max(len(text) * 0.06, 2.0),
            "text": text,
        })
        current_time = raw_segs[-1]["end_time"]

    # A line ends where the next begins, unless the next one is out of order
    for i in range(len(raw_segs) - 1):
        nxt = raw_segs[i + 1]["start_time"]
        if nxt >= raw_segs[i]["start_time"]:
            raw_segs[i]["end_time"] = nxt

    return _build_segments(raw_segs, meeting_id)


def parse_json(content: str, meeting_id: int) -> List[TranscriptSegment]:
    """
    Parse JSON transcript format.
    Expected: [{"speaker": "Name", "start_time": 0.0, "end_time": 5.2, "text": "..."}]
    Also supports "speaker_name", "start"/"end", and an object wrapping the list in "segments" or "transcript".
    """
    try:
        data = json.loads(content, parse_constant=_reject_constant)
    except json.JSONDecodeError as exc:
        raise TranscriptError(f"Invalid JSON: {exc}")
    if isinstance(data, dict):
        data = data.get("segments", data.get("transcript", []))
    if not isinstance(data, list):
        raise TranscriptError("JSON transcript must be a list of segments")

    raw_segs = []
    for n, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise TranscriptError(f"Segment {n} must be an object")
        text = item.get("text")
        if not isinstance(text, str) or not text.strip():
            raise TranscriptError(f"Segment {n} needs non-empty text")
        speaker = item.get("speaker_name") or item.get("speaker") or "Speaker"
        if not isinstance(speaker, str):
            raise TranscriptError(f"Segment {n} speaker must be text")
        start = _seconds(item.get("start_time", item.get("start", 0.0)), f"Segment {n} start_time")
        end = _seconds(item.get("end_time", item.get("end", start)), f"Segment {n} end_time")
        raw_segs.append({
            "speaker_name": speaker.strip()[:MAX_SPEAKER_LENGTH] or "Speaker",
            "start_time": start,
            "end_time": end,
            "text": text.strip(),
        })

    return _build_segments(raw_segs, meeting_id)


def parse_transcript_file(content: str, filename: str, meeting_id: int) -> List[TranscriptSegment]:
    """Route to the right parser based on file extension."""
    fname = filename.lower()
    if fname.endswith(".vtt"):
        return parse_vtt(content, meeting_id)
    if fname.endswith(".json"):
        return parse_json(content, meeting_id)
    return parse_txt(content, meeting_id)


def parse_transcript_text(text: str, meeting_id: int) -> List[TranscriptSegment]:
    """Parse a pasted plain-text transcript."""
    return parse_txt(text, meeting_id)


def parse_upload(raw: bytes, filename: str, meeting_id: int) -> List[TranscriptSegment]:
    """Decode and parse an uploaded file; raises TranscriptError for anything we cannot turn into segments."""
    name = (filename or "").lower()
    if not name.endswith(ALLOWED_EXTENSIONS):
        raise TranscriptError("Unsupported file type: upload a .txt, .vtt or .json transcript")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise TranscriptError("File is too large (limit 5 MB)")
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise TranscriptError("The file is not valid UTF-8 text")
    segments = parse_transcript_file(content, name, meeting_id)
    if not segments:
        raise TranscriptError("No transcript lines were found in the file")
    return segments
