import { format, isSameDay, isSameYear, subDays } from "date-fns";

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** "Today", "Yesterday", "Thu, Jul 23" (adds the year for other years). Input order is preserved. */
export function dayLabel(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, subDays(now, 1))) return "Yesterday";
  return format(date, isSameYear(date, now) ? "EEE, MMM d" : "EEE, MMM d, yyyy");
}

export function groupByDay<T extends { date: string }>(items: T[], now: Date = new Date()): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const key = format(new Date(item.date), "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(item.date, now), items: [item] });
  }
  return groups;
}

/** "Jul 23 · 5:28 PM · 6 min" pieces for a meeting row. */
export function rowMeta(date: string, durationSeconds: number): string {
  const d = new Date(date);
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${format(d, "MMM d")} · ${format(d, "h:mm a")} · ${minutes} min`;
}
