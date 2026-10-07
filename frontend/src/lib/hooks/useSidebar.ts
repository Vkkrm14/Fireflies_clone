"use client";

import { useSyncExternalStore } from "react";
import { SIDEBAR_STORAGE_KEY, parseSidebar, railState } from "../sidebar";

const listeners = new Set<() => void>();

function readExpanded(): boolean {
  try {
    return parseSidebar(localStorage.getItem(SIDEBAR_STORAGE_KEY));
  } catch {
    return false;
  }
}

function setExpanded(expanded: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, railState(expanded));
  } catch {
    // storage blocked: the sidebar still changes for this page view
  }
  document.documentElement.setAttribute("data-rail", railState(expanded));
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SIDEBAR_STORAGE_KEY) return;
    document.documentElement.setAttribute("data-rail", railState(readExpanded()));
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether the side navigation is expanded (saved in this browser) and a toggle. Server render assumes collapsed. */
export function useSidebar(): [boolean, () => void] {
  const expanded = useSyncExternalStore(subscribe, readExpanded, () => false);
  return [expanded, () => setExpanded(!readExpanded())];
}
