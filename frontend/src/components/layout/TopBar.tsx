"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Search, Video } from "lucide-react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { titleForPath } from "@/lib/routes";
import { useUiStore } from "@/lib/store/ui";
import styles from "./TopBar.module.css";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const setCaptureOpen = useUiStore((s) => s.setCaptureOpen);
  const pendingFocus = useUiStore((s) => s.pendingSearchFocus);
  const setPendingFocus = useUiStore((s) => s.setPendingSearchFocus);

  // Ctrl+K itself is handled in AppShell so it works on every page; here we only answer its request to focus.
  useEffect(() => {
    if (!pendingFocus) return;
    inputRef.current?.focus();
    setPendingFocus(false);
  }, [pendingFocus, setPendingFocus]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search/${encodeURIComponent(q)}`);
  };

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{titleForPath(pathname)}</h1>

      <form onSubmit={submit} role="search" className={styles.search}>
        <Search size={15} aria-hidden />
        <input
          ref={inputRef}
          data-global-search
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or keyword"
          aria-label="Search by title or keyword"
        />
        <kbd>Ctrl + K</kbd>
      </form>

      <div className={styles.actions}>
        <span className={styles.credits}>
          <b>3</b> Free meetings
        </span>
        <button type="button" className={styles.upgrade} onClick={() => router.push("/upgrade")}>
          Upgrade
        </button>
        <NotificationsMenu />
        <div className={styles.capture}>
          <button type="button" className={styles.captureMain} onClick={() => setCaptureOpen(true)}>
            <Video size={15} aria-hidden /> Capture
          </button>
          <ActionMenu
            trigger={
              <button type="button" className={styles.captureMore} aria-label="Capture options">
                <ChevronDown size={14} />
              </button>
            }
            items={[
              { label: "Add a meeting", onSelect: () => setCaptureOpen(true) },
              { label: "Upload a transcript", onSelect: () => setCaptureOpen(true) },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

export function NotificationsMenu() {
  const router = useRouter();
  return (
    <ActionMenu
      trigger={
        <button type="button" className={styles.bell} aria-label="Notifications">
          <Bell size={18} />
          <span className={styles.badge} />
        </button>
      }
      header={<p className={styles.menuHeader}>Notifications</p>}
      items={[
        { label: "Your meeting summaries are ready", onSelect: () => router.push("/notebook/mine-shared") },
        { label: "Connect Slack and Gmail for richer answers", onSelect: () => router.push("/integrations") },
        { label: "You have 3 free meetings left", onSelect: () => router.push("/upgrade") },
      ]}
    />
  );
}
