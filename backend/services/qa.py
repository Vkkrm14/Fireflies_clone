"""Extractive 'ask about this meeting': ranks transcript lines by keyword overlap with the question.

No LLM is involved, so every answer is built only from, and cites, real transcript lines.
"""
import re
from typing import Any

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "is",
    "was", "are", "were", "be", "been", "do", "does", "did", "what", "who", "when", "where", "why", "how", "which",
    "about", "that", "this", "these", "those", "they", "them", "their", "we", "i", "you", "it", "its", "say", "said",
    "tell", "me", "us", "any", "all", "can", "could", "would", "should", "will", "have", "has", "had", "there",
}


def keywords(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOPWORDS and len(w) > 2}


def answer_question(question: str, segments, limit: int = 3) -> dict[str, Any]:
    wanted = keywords(question)
    scored = []
    for seg in segments:
        overlap = len(wanted & keywords(seg.text))
        if overlap:
            scored.append((overlap, seg))
    scored.sort(key=lambda pair: (-pair[0], pair[1].segment_index))
    top = sorted((seg for _, seg in scored[:limit]), key=lambda s: s.segment_index)
    if not top:
        return {"answer": "I could not find anything about that in this meeting's transcript.", "sources": []}
    answer = "Here is what the transcript says: " + " ".join(f'{s.speaker_name}: "{s.text}"' for s in top)
    sources = [
        {"segment_id": s.id, "speaker_name": s.speaker_name, "start_time": s.start_time, "text": s.text} for s in top
    ]
    return {"answer": answer, "sources": sources}
