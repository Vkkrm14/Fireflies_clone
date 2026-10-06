"""
Summary generator service.
Generates structured summaries from transcript data.
Uses template-based generation (no external LLM required).
Can be extended to use OpenAI/Anthropic for richer summaries.
"""
from typing import List, Dict, Any
import json


def generate_meeting_summary(meeting) -> Dict[str, Any]:
    """
    Generate a summary from a Meeting ORM object's transcript segments.
    Returns dict with: overview, key_topics, chapters
    """
    segments = sorted(meeting.transcript_segments, key=lambda s: s.segment_index)

    if not segments:
        return {
            "overview": "No transcript available to summarize.",
            "key_topics": [],
            "chapters": [],
        }

    # Build full transcript text
    full_text_lines = [f"{seg.speaker_name}: {seg.text}" for seg in segments]
    full_text = "\n".join(full_text_lines)

    # Collect unique speakers
    speakers = list(dict.fromkeys(seg.speaker_name for seg in segments))

    # Duration
    total_duration = segments[-1].end_time if segments else 0
    mins = int(total_duration // 60)

    # Generate overview (template-based)
    overview = (
        f"This {mins}-minute meeting involved {', '.join(speakers[:3])}"
        f"{' and others' if len(speakers) > 3 else ''}. "
        f"The discussion covered {len(segments)} exchanges across various topics. "
        f"Key points were raised and action items were identified during the session. "
        f"Participants engaged in a productive dialogue covering the meeting agenda."
    )

    # Extract topics by finding frequently mentioned words (simple heuristic)
    all_words = full_text.lower().split()
    stopwords = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "up", "as", "is", "was", "are", "were",
        "be", "been", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "that", "this", "these", "those",
        "we", "i", "you", "he", "she", "they", "it", "our", "your", "their",
        "so", "if", "then", "than", "just", "like", "about", "can", "all",
        "not", "also", "what", "how", "when", "who", "which", "there", "my",
        "its", "yes", "no", "very", "really", "going", "going", "think", "know",
        "want", "need", "sure", "right", "okay", "well", "get", "got",
    }
    word_freq: Dict[str, int] = {}
    for word in all_words:
        word = word.strip(".,!?\"'();:")
        if len(word) > 4 and word not in stopwords and word.isalpha():
            word_freq[word] = word_freq.get(word, 0) + 1

    top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:8]
    key_topics = [w.title() for w, _ in top_words]

    # Generate chapters by splitting into ~5 equal sections
    chapter_count = min(5, max(3, len(segments) // 8), len(segments))
    chapter_size = max(1, len(segments) // chapter_count)
    chapters = []
    chapter_titles = [
        "Meeting Introduction", "Core Discussion", "Key Decisions",
        "Action Planning", "Wrap-Up & Next Steps", "Q&A Session",
    ]

    for i in range(chapter_count):
        start_seg = segments[i * chapter_size]
        title = chapter_titles[i] if i < len(chapter_titles) else f"Section {i + 1}"
        chapters.append({
            "title": title,
            "start_time": start_seg.start_time,
        })

    return {
        "overview": overview,
        "key_topics": key_topics,
        "chapters": chapters,
    }
