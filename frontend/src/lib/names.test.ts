import test from "node:test";
import assert from "node:assert/strict";
import { splitNames, toLocalInput } from "./names.ts";

test("splitNames trims, drops blanks and de-duplicates case-insensitively", () => {
  assert.deepEqual(splitNames("Ana, Bo,, ana ,  Chidi"), ["Ana", "Bo", "Chidi"]);
  assert.deepEqual(splitNames(" , "), []);
});

test("toLocalInput formats local time for datetime-local inputs", () => {
  const d = new Date(2026, 9, 6, 9, 5);
  assert.equal(toLocalInput(d.toISOString()), "2026-10-06T09:05");
  assert.equal(toLocalInput("not a date"), "");
});
