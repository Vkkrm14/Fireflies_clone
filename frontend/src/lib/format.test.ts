import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDuration, formatTimestamp, formatMeetingDate, formatParticipants } from "./format.ts";

test("formatDuration rounds to minutes and uses hours when needed", () => {
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatDuration(30), "1m");
  assert.equal(formatDuration(45 * 60), "45m");
  assert.equal(formatDuration(336), "6m");
  assert.equal(formatDuration(3600), "1h");
  assert.equal(formatDuration(3900), "1h 5m");
});

test("formatTimestamp pads and switches to h:mm:ss", () => {
  assert.equal(formatTimestamp(42), "00:42");
  assert.equal(formatTimestamp(75.9), "01:15");
  assert.equal(formatTimestamp(3725), "1:02:05");
  assert.equal(formatTimestamp(-4), "00:00");
  assert.equal(formatTimestamp(Number.NaN), "00:00");
});

test("formatMeetingDate is relative for today and yesterday", () => {
  const now = new Date(2026, 9, 6, 12, 0);
  assert.equal(formatMeetingDate(new Date(2026, 9, 6, 9, 5), now), "Today, 9:05 AM");
  assert.equal(formatMeetingDate(new Date(2026, 9, 5, 18, 40), now), "Yesterday, 6:40 PM");
  assert.equal(formatMeetingDate(new Date(2026, 8, 3, 10, 0), now), "Sep 3, 2026");
});

test("formatParticipants pluralises", () => {
  assert.equal(formatParticipants(1), "1 person");
  assert.equal(formatParticipants(4), "4 people");
});
