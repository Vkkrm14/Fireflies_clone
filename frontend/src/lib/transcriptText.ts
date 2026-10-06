import { formatTimestamp } from "./format.ts";
import type { TranscriptSegment } from "./types.ts";

/** "[00:12] Speaker: text" per line, for the Download action. */
export function transcriptToText(title: string, segments: Pick<TranscriptSegment, "speaker_name" | "start_time" | "text">[]): string {
  const lines = segments.map((s) => `[${formatTimestamp(s.start_time)}] ${s.speaker_name}: ${s.text}`);
  return [title, "", ...lines, ""].join("\n");
}

export function downloadText(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
