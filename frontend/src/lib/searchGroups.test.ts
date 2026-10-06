import test from "node:test";
import assert from "node:assert/strict";
import { groupSearchResults, hitLabel, hitHref, parseSeekParam } from "./searchGroups.ts";
import type { GlobalSearchResult } from "./types.ts";

const hit = (over: Partial<GlobalSearchResult>): GlobalSearchResult => ({
  type: "transcript",
  meeting_id: 1,
  meeting_title: "Roadmap",
  date: "2026-10-06T10:00:00Z",
  snippet: "x",
  ...over,
});

test("groupSearchResults merges hits per meeting in first-seen order", () => {
  const groups = groupSearchResults([
    hit({ meeting_id: 2, meeting_title: "B", type: "meeting" }),
    hit({ meeting_id: 1, start_time: 5 }),
    hit({ meeting_id: 2, start_time: 9 }),
  ]);
  assert.deepEqual(groups.map((g) => [g.meetingId, g.hits.length]), [[2, 2], [1, 1]]);
  assert.equal(groups[0].title, "B");
});

test("hitLabel names the kind of match instead of inventing a speaker and time", () => {
  assert.equal(hitLabel(hit({ type: "meeting" })), "Title match");
  assert.equal(hitLabel(hit({ type: "summary" })), "Summary");
  assert.equal(hitLabel(hit({ type: "transcript", speaker_name: "Ana", start_time: 75 })), "Ana · 01:15");
});

test("hitHref deep-links transcript hits to their timestamp", () => {
  assert.equal(hitHref(hit({ type: "transcript", start_time: 75.4 })), "/notebook/1?t=75");
  assert.equal(hitHref(hit({ type: "summary" })), "/notebook/1");
});

test("parseSeekParam accepts only finite non-negative seconds", () => {
  assert.equal(parseSeekParam("?t=75"), 75);
  assert.equal(parseSeekParam("?t=0"), 0);
  assert.equal(parseSeekParam("?t=-3"), null);
  assert.equal(parseSeekParam("?t=abc"), null);
  assert.equal(parseSeekParam(""), null);
});
