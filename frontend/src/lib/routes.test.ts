import test from "node:test";
import assert from "node:assert/strict";
import { chromeForPath, isChannelId, parseMeetingId, titleForPath, viewHref } from "./routes.ts";

test("channel ids are recognised", () => {
  assert.equal(isChannelId("mine-shared"), true);
  assert.equal(isChannelId("uploads"), true);
  assert.equal(isChannelId("12"), false);
});

test("parseMeetingId handles plain and slug::id forms", () => {
  assert.equal(parseMeetingId("12"), 12);
  assert.equal(parseMeetingId("Q3-Roadmap::7"), 7);
  assert.equal(parseMeetingId(encodeURIComponent("Q3-Roadmap::7")), 7);
  assert.equal(parseMeetingId("mine-shared"), null);
  assert.equal(parseMeetingId("abc::x"), null);
});

test("viewHref round-trips through parseMeetingId", () => {
  const href = viewHref({ id: 3, title: "Customer Onboarding Call — Acme Corp" });
  assert.match(href, /^\/view\/Customer-Onboarding-Call-Acme-Corp::3$/);
  assert.equal(parseMeetingId(href.replace("/view/", "")), 3);
});

test("chromeForPath picks the right layout", () => {
  assert.equal(chromeForPath("/"), "shell");
  assert.equal(chromeForPath("/notebook/mine-shared"), "shell");
  assert.equal(chromeForPath("/notebook/5"), "notebook");
  assert.equal(chromeForPath("/view/Title::5"), "notebook");
  assert.equal(chromeForPath("/settings/meeting-recording"), "settings");
});

test("titleForPath names the top bar", () => {
  assert.equal(titleForPath("/"), "Home");
  assert.equal(titleForPath("/notebook/all"), "Meetings");
  assert.equal(titleForPath("/welcome/tasks"), "Tasks");
});
