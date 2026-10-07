"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/lib/hooks/useUser";
import { ROUTES, SETTINGS_SECTIONS } from "@/lib/routes";
import styles from "./settings.module.css";

interface ToggleRow {
  id: string;
  label: string;
  help: string;
  on: boolean;
}

const RECORDING: ToggleRow[] = [
  { id: "auto-record", label: "Auto-record meetings", help: "Fireflies notetaker will join and record your calendar events.", on: true },
  { id: "video", label: "Capture meeting video", help: "Capture your meeting screen and shared content as video.", on: false },
  { id: "auto-delete", label: "Auto-delete meetings", help: "Automatically delete meetings after a set retention period.", on: false },
];

function Toggle({ row }: { row: ToggleRow }) {
  const [on, setOn] = useState(row.on);
  const toast = useToast();
  return (
    <div className={styles.row}>
      <div>
        <b>{row.label}</b>
        <p>{row.help}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={row.label}
        className={styles.switch}
        onClick={() => {
          setOn(!on);
          toast.info("Saved locally", "Settings are placeholders and aren't stored.");
        }}
      />
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams<{ subroute?: string[] }>();
  const router = useRouter();
  const { data: user } = useUser();
  const slug = params.subroute?.[0];
  const section = SETTINGS_SECTIONS.find((s) => s.slug === slug);

  useEffect(() => {
    if (!slug) router.replace(ROUTES.settings);
  }, [slug, router]);

  return (
    <div className={styles.layout}>
      <aside className={styles.nav}>
        <Link href={ROUTES.meetings} className={styles.back} aria-label="Back to Fireflies">
          <ArrowLeft size={16} />
        </Link>
        <div className={styles.account}>
          <Avatar name={user?.name ?? "You"} src={user?.avatar_url} size={28} />
          <div>
            <b>{user?.email ?? "…"}</b>
            <span>Free Plan</span>
          </div>
        </div>
        <div className={styles.scope} role="group" aria-label="Settings scope">
          <button type="button" aria-pressed="true">Personal</button>
          <button type="button" aria-pressed="false" disabled title="Team settings are coming soon">Team</button>
        </div>
        <ul>
          {SETTINGS_SECTIONS.map((s) => (
            <li key={s.slug}>
              <Link href={`/settings/${s.slug}`} aria-current={s.slug === slug ? "page" : undefined}>
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <section className={styles.content}>
        <label className={styles.search}>
          <Search size={14} aria-hidden />
          <input placeholder="Search settings" aria-label="Search settings" />
        </label>

        <h2>{section?.label ?? "Settings"}</h2>
        {slug === "language-appearance" ? (
          <ThemePicker />
        ) : slug === "meeting-recording" ? (
          <div className={styles.card}>
            {RECORDING.map((row) => (
              <Toggle key={row.id} row={row} />
            ))}
            <div className={styles.row}>
              <div>
                <b>Meeting language</b>
                <p>For transcripts and summaries.</p>
              </div>
              <span className={styles.value}>English (Global)</span>
            </div>
          </div>
        ) : slug === "account" ? (
          <div className={styles.card}>
            <div className={styles.row}>
              <div>
                <b>Name</b>
                <p>{user?.name ?? "…"}</p>
              </div>
            </div>
            <div className={styles.row}>
              <div>
                <b>Email</b>
                <p>{user?.email ?? "…"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className={styles.placeholder}>This section is a placeholder in the clone.</p>
        )}
      </section>
    </div>
  );
}
