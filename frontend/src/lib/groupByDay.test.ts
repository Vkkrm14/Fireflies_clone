import test from "node:test";
import assert from "node:assert/strict";
import { dayLabel, groupByDay, rowMeta } from "./groupByDay.ts";

const now = new Date(2026, 9, 6, 12, 0, 0);

test("dayLabel names today, yesterday and older days", () => {
  assert.equal(dayLabel(new Date(2026, 9, 6, 8, 0), now), "Today");
  assert.equal(dayLabel(new Date(2026, 9, 5, 8, 0), now), "Yesterday");
  assert.equal(dayLabel(new Date(2026, 9, 1, 8, 0), now), "Thu, Oct 1");
  assert.equal(dayLabel(new Date(2025, 11, 31, 8, 0), now), "Wed, Dec 31, 2025");
});

test("groupByDay keeps order and merges same-day items", () => {
  const items = [
    { id: 1, date: new Date(2026, 9, 6, 9, 0).toISOString() },
    { id: 2, date: new Date(2026, 9, 6, 8, 0).toISOString() },
    { id: 3, date: new Date(2026, 9, 3, 8, 0).toISOString() },
  ];
  const groups = groupByDay(items, now);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].items.map((i) => i.id), [1, 2]);
  assert.equal(groups[1].label, "Sat, Oct 3");
});

test("rowMeta formats date, time and minutes", () => {
  assert.equal(rowMeta(new Date(2026, 9, 3, 17, 28).toISOString(), 330), "Oct 3 · 5:28 PM · 6 min");
  assert.equal(rowMeta(new Date(2026, 9, 3, 17, 28).toISOString(), 10), "Oct 3 · 5:28 PM · 1 min");
});
