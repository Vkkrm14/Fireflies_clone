import test from "node:test";
import assert from "node:assert/strict";
import { activeSegmentIndex, matchingSegments, speakerStats } from "./transcript.ts";

const segs = [
  { speaker_name: "Ana", speaker_color: "#111111", start_time: 0, end_time: 10, text: "Welcome to the roadmap review" },
  { speaker_name: "Bo", speaker_color: "#222222", start_time: 10, end_time: 30, text: "Thanks, the roadmap looks good to me" },
  { speaker_name: "Ana", speaker_color: "#111111", start_time: 30, end_time: 40, text: "Great" },
];

test("activeSegmentIndex follows playback time", () => {
  assert.equal(activeSegmentIndex(segs, 0), 0);
  assert.equal(activeSegmentIndex(segs, 9.9), 0);
  assert.equal(activeSegmentIndex(segs, 10), 1);
  assert.equal(activeSegmentIndex(segs, 35), 2);
  assert.equal(activeSegmentIndex(segs, 999), 2);
  assert.equal(activeSegmentIndex([], 5), -1);
  assert.equal(activeSegmentIndex([{ start_time: 5, end_time: 8 }], 2), -1);
});

test("speakerStats totals talk time and shares", () => {
  const stats = speakerStats(segs);
  assert.deepEqual(stats.map((s) => s.name), ["Ana", "Bo"]);
  assert.equal(stats[0].seconds, 20);
  assert.equal(stats[0].share, 50);
  assert.equal(stats[1].words, 7);
  assert.equal(stats[1].wpm, 21);
});

test("matchingSegments is case-insensitive and ignores empty queries", () => {
  assert.deepEqual(matchingSegments(segs, "ROADMAP"), [0, 1]);
  assert.deepEqual(matchingSegments(segs, "  "), []);
  assert.deepEqual(matchingSegments(segs, "zzz"), []);
});
