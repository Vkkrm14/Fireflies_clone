import { test } from "node:test";
import assert from "node:assert/strict";
import { splitByQuery, countMatches } from "./highlight.ts";

test("splitByQuery marks case-insensitive matches", () => {
  assert.deepEqual(splitByQuery("Hello world, hello!", "hello"), [
    { text: "Hello", match: true },
    { text: " world, ", match: false },
    { text: "hello", match: true },
    { text: "!", match: false },
  ]);
});

test("splitByQuery handles empty, missing and regex-special queries", () => {
  assert.deepEqual(splitByQuery("abc", ""), [{ text: "abc", match: false }]);
  assert.deepEqual(splitByQuery("abc", "x"), [{ text: "abc", match: false }]);
  assert.deepEqual(splitByQuery("a.b*c", "."), [
    { text: "a", match: false },
    { text: ".", match: true },
    { text: "b*c", match: false },
  ]);
});

test("countMatches counts non-overlapping matches", () => {
  assert.equal(countMatches("aaa", "a"), 3);
  assert.equal(countMatches("aaaa", "aa"), 2);
  assert.equal(countMatches("ab", ""), 0);
});
