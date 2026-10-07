"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, parsePreference, resolveTheme, type ThemePreference } from "../theme";

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

function setPreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // storage blocked: the choice still applies for this page view
  }
  applyTheme(preference);
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Another tab changed the preference
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readPreference());
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

/** The saved theme preference and a setter that applies and persists it. Server render assumes the default. */
export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribe, readPreference, () => DEFAULT_THEME);
  return [preference, setPreference];
}

/** Keep "System" in step with the device while the app is open. Mount once, in the app shell. */
export function useSystemThemeSync() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readPreference() === "system") applyTheme("system");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
}
