import { formatTimestamp } from "./format.ts";
import type { GlobalSearchResult } from "./types.ts";

export interface SearchGroup {
  meetingId: number;
  title: string;
  date: string | null;
  hits: GlobalSearchResult[];
}

/** Collapse flat search hits into one group per meeting, ordered by each meeting's first hit. */
export function groupSearchResults(results: GlobalSearchResult[]): SearchGroup[] {
  const groups = new Map<number, SearchGroup>();
  for (const r of results) {
    const group = groups.get(r.meeting_id) ?? { meetingId: r.meeting_id, title: r.meeting_title, date: r.date, hits: [] };
    group.hits.push(r);
    groups.set(r.meeting_id, group);
  }
  return [...groups.values()];
}

export function hitLabel(hit: GlobalSearchResult): string {
  if (hit.type === "meeting") return "Title match";
  if (hit.type === "summary") return "Summary";
  return `${hit.speaker_name ?? "Speaker"} · ${formatTimestamp(hit.start_time ?? 0)}`;
}

/** Transcript hits open the meeting at the matching line (`?t=` seconds); other hits open it at the start. */
export function hitHref(hit: GlobalSearchResult): string {
  const base = `/notebook/${hit.meeting_id}`;
  return hit.type === "transcript" && hit.start_time !== undefined ? `${base}?t=${Math.floor(hit.start_time)}` : base;
}

/** Read `?t=` from a location search string; anything but finite non-negative seconds is ignored. */
export function parseSeekParam(search: string): number | null {
  const raw = new URLSearchParams(search).get("t");
  if (raw === null || raw.trim() === "") return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
