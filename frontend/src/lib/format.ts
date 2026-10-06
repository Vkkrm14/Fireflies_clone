import { format, isSameDay, subDays } from "date-fns";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0m";
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatTimestamp(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}` : `${pad2(m)}:${pad2(sec)}`;
}

export function formatMeetingDate(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  if (isSameDay(date, now)) return `Today, ${format(date, "h:mm a")}`;
  if (isSameDay(date, subDays(now, 1))) return `Yesterday, ${format(date, "h:mm a")}`;
  return format(date, "MMM d, yyyy");
}

export function formatParticipants(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}
