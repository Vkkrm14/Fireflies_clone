import type { TranscriptSegment } from "./types.ts";

type Timed = Pick<TranscriptSegment, "start_time" | "end_time">;

/** Index of the segment playing at `time`, or -1 before the first one. Segments must be ordered by start_time. */
export function activeSegmentIndex(segments: Timed[], time: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start_time <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found === -1) return -1;
  return found;
}

export interface SpeakerStat {
  name: string;
  color: string | null;
  words: number;
  seconds: number;
  wpm: number;
  share: number;
}

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** Words, talk time, words-per-minute and share of total talk time per speaker, ordered by talk time. */
export function speakerStats(segments: Pick<TranscriptSegment, "speaker_name" | "speaker_color" | "start_time" | "end_time" | "text">[]): SpeakerStat[] {
  const map = new Map<string, SpeakerStat>();
  for (const s of segments) {
    const stat = map.get(s.speaker_name) ?? { name: s.speaker_name, color: s.speaker_color, words: 0, seconds: 0, wpm: 0, share: 0 };
    stat.words += wordCount(s.text);
    stat.seconds += Math.max(0, s.end_time - s.start_time);
    map.set(s.speaker_name, stat);
  }
  const stats = [...map.values()];
  const total = stats.reduce((sum, s) => sum + s.seconds, 0);
  for (const s of stats) {
    s.wpm = s.seconds > 0 ? Math.round(s.words / (s.seconds / 60)) : 0;
    s.share = total > 0 ? Math.round((s.seconds / total) * 100) : 0;
  }
  return stats.sort((a, b) => b.seconds - a.seconds);
}

/** Indexes of segments whose text contains `query` (case-insensitive). */
export function matchingSegments(segments: Pick<TranscriptSegment, "text">[], query: string): number[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: number[] = [];
  segments.forEach((s, i) => {
    if (s.text.toLowerCase().includes(q)) out.push(i);
  });
  return out;
}
