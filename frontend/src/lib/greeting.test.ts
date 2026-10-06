import test from "node:test";
import assert from "node:assert/strict";
import { greeting } from "./greeting.ts";

test("greeting follows the hour", () => {
  assert.equal(greeting(new Date(2026, 0, 1, 6)), "Good Morning");
  assert.equal(greeting(new Date(2026, 0, 1, 12)), "Good Afternoon");
  assert.equal(greeting(new Date(2026, 0, 1, 17)), "Good Evening");
  assert.equal(greeting(new Date(2026, 0, 1, 23)), "Good Evening");
});
