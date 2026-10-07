/** Expanded / collapsed side navigation: pure logic shared by the rail and the pre-paint script. */
export const SIDEBAR_STORAGE_KEY = "ff-sidebar";

export type RailState = "expanded" | "collapsed";

export function parseSidebar(raw: string | null | undefined): boolean {
  return raw === "expanded";
}

export function railState(expanded: boolean): RailState {
  return expanded ? "expanded" : "collapsed";
}

/**
 * Runs in <head> before first paint and sets `data-rail` on <html>; the CSS reads it to size the rail and show
 * labels, so a saved "expanded" sidebar never flashes collapsed. On phone-sized screens (<= 900px) it stays collapsed,
 * because an expanded rail there floats over the page. Tested against stub globals in sidebar.test.ts.
 */
export const SIDEBAR_INIT_SCRIPT = `(function(){try{
var open=localStorage.getItem(${JSON.stringify(SIDEBAR_STORAGE_KEY)})==="expanded"&&window.innerWidth>900;
document.documentElement.setAttribute("data-rail",open?"expanded":"collapsed");
}catch(e){}})();`;
