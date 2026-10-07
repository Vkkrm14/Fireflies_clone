import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, parsePreference, resolveTheme } from "./theme.ts";

test("parsePreference accepts the three modes and falls back to the default", () => {
  assert.equal(parsePreference("light"), "light");
  assert.equal(parsePreference("dark"), "dark");
  assert.equal(parsePreference("system"), "system");
  assert.equal(parsePreference("purple"), DEFAULT_THEME);
  assert.equal(parsePreference(null), DEFAULT_THEME);
  assert.equal(parsePreference(""), DEFAULT_THEME);
});

test("resolveTheme follows the device only in system mode", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});

/** Runs the inline pre-paint script against stand-ins for the browser globals. */
function runInitScript(stored: string | null, systemDark: boolean) {
  const attrs: Record<string, string> = {};
  const style: Record<string, string> = {};
  const document = { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v), style } };
  const localStorage = { getItem: (k: string) => (k === THEME_STORAGE_KEY ? stored : null) };
  const window = { matchMedia: () => ({ matches: systemDark }) };
  new Function("document", "localStorage", "window", THEME_INIT_SCRIPT)(document, localStorage, window);
  return { theme: attrs["data-theme"], scheme: style.colorScheme };
}

test("the pre-paint script applies the stored or default theme", () => {
  assert.deepEqual(runInitScript("light", true), { theme: "light", scheme: "light" });
  assert.deepEqual(runInitScript("dark", false), { theme: "dark", scheme: "dark" });
  assert.deepEqual(runInitScript("system", true), { theme: "dark", scheme: "dark" });
  assert.deepEqual(runInitScript("system", false), { theme: "light", scheme: "light" });
  assert.equal(runInitScript(null, false).theme, resolveTheme(DEFAULT_THEME, false));
  assert.equal(runInitScript("garbage", false).theme, resolveTheme(DEFAULT_THEME, false));
});

test("the pre-paint script never throws when storage is unavailable", () => {
  const document = { documentElement: { setAttribute() {}, style: {} } };
  const localStorage = { getItem: () => { throw new Error("blocked"); } };
  assert.doesNotThrow(() => new Function("document", "localStorage", "window", THEME_INIT_SCRIPT)(document, localStorage, {}));
});
