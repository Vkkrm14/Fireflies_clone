import { test } from "node:test";
import assert from "node:assert/strict";
import { initials, avatarColor, readableTextColor, AVATAR_COLORS } from "./avatar.ts";

test("initials uses first and last word", () => {
  assert.equal(initials("Sarah Chen"), "SC");
  assert.equal(initials("Priya"), "P");
  assert.equal(initials("alex johnson smith"), "AS");
  assert.equal(initials("   "), "?");
});

test("avatarColor is stable and from the palette", () => {
  assert.equal(avatarColor("Sarah Chen"), avatarColor("Sarah Chen"));
  assert.ok(AVATAR_COLORS.includes(avatarColor("Marcus Williams")));
});

test("readableTextColor picks the higher-contrast text colour", () => {
  assert.equal(readableTextColor("#6c5ce7"), "#ffffff");
  assert.equal(readableTextColor("#fdcb6e"), "#1f2937");
});
