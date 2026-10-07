/** Light / dark / system theme preference: pure logic shared by the app, the settings page and the pre-paint script. */
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ff-theme";
export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];
/** Dark stays the default: it is how Fireflies renders meetings, and how this app has always looked. */
export const DEFAULT_THEME: ThemePreference = "dark";

export function parsePreference(raw: string | null | undefined): ThemePreference {
  return raw === "light" || raw === "dark" || raw === "system" ? raw : DEFAULT_THEME;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/**
 * Inline script that runs in <head> before first paint so the page never flashes the wrong theme.
 * Kept as a string because it must execute before React; theme.test.ts runs it against stub globals.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(p!=="light"&&p!=="dark"&&p!=="system")p=${JSON.stringify(DEFAULT_THEME)};
var dark=p==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches:p==="dark";
var t=dark?"dark":"light";
document.documentElement.setAttribute("data-theme",t);
document.documentElement.style.colorScheme=t;
}catch(e){}})();`;
