import test from "node:test";
import assert from "node:assert/strict";
import { SIDEBAR_INIT_SCRIPT, SIDEBAR_STORAGE_KEY, parseSidebar, railState } from "./sidebar.ts";

test("parseSidebar reads only the stored 'expanded' value as expanded", () => {
  assert.equal(parseSidebar("expanded"), true);
  assert.equal(parseSidebar("collapsed"), false);
  assert.equal(parseSidebar(null), false);
  assert.equal(parseSidebar("yes"), false);
});

test("railState names the attribute value the CSS keys off", () => {
  assert.equal(railState(true), "expanded");
  assert.equal(railState(false), "collapsed");
});

function runInitScript(stored: string | null, throwing = false, width = 1280) {
  const attrs: Record<string, string> = {};
  const document = { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } };
  const localStorage = {
    getItem: (k: string) => {
      if (throwing) throw new Error("blocked");
      return k === SIDEBAR_STORAGE_KEY ? stored : null;
    },
  };
  new Function("document", "localStorage", "window", SIDEBAR_INIT_SCRIPT)(document, localStorage, { innerWidth: width });
  return attrs["data-rail"];
}

test("the pre-paint script restores the saved sidebar state", () => {
  assert.equal(runInitScript("expanded"), "expanded");
  assert.equal(runInitScript("collapsed"), "collapsed");
  assert.equal(runInitScript(null), "collapsed");
  assert.equal(runInitScript("garbage"), "collapsed");
});

test("a saved expanded sidebar is not forced open over a phone-sized screen", () => {
  assert.equal(runInitScript("expanded", false, 375), "collapsed");
  assert.equal(runInitScript("expanded", false, 901), "expanded");
});

test("the pre-paint script never throws when storage is unavailable", () => {
  assert.doesNotThrow(() => runInitScript(null, true));
});
