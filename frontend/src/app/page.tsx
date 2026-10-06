"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, ListChecks, Rss, Sparkles, Users, Video } from "lucide-react";
import { AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { greeting } from "@/lib/greeting";
import { rowMeta } from "@/lib/groupByDay";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useUser } from "@/lib/hooks/useUser";
import { notebookHref, ROUTES } from "@/lib/routes";
import styles from "./home.module.css";

type Tab = "recent" | "upcoming" | "feed";

const TABS: { id: Tab; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "upcoming", label: "Upcoming" },
  { id: "feed", label: "AI Feed" },
];

export default function HomePage() {
  const { data: user } = useUser();
  const { data, error, isLoading, mutate: reload } = useMeetings({ sort: "newest", page_size: 100 });
  const [tab, setTab] = useState<Tab>("recent");
  const meetings = data?.meetings ?? [];
  const pending = meetings.reduce((n, m) => n + (m.action_items_count - m.completed_action_items_count), 0);
  const people = new Set(meetings.flatMap((m) => m.participants.map((p) => p.name))).size;
  const summaries = meetings.filter((m) => m.summary_snippet).length;
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className={styles.page}>
      <div className={styles.hero} aria-hidden />
      <div className={styles.inner}>
        <h2 className={styles.greeting}>
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h2>

        <div className={styles.cards}>
          <Link href={ROUTES.tasks} className={styles.card}>
            <ListChecks size={16} aria-hidden /> <b>{pending} Tasks</b> <span>open</span>
          </Link>
          <Link href={ROUTES.skills} className={styles.card}>
            <Sparkles size={16} aria-hidden /> <b>AI Skills</b> <span className={styles.new}>NEW</span>
          </Link>
          <Link href={ROUTES.meetings} className={styles.card}>
            <Users size={16} aria-hidden /> <b>{people} Contacts</b>
          </Link>
        </div>

        <p className={styles.sectionLabel}>
          <Sparkles size={13} aria-hidden /> Personal Assistant
        </p>
        <div className={styles.assistant}>
          <div className={styles.tile}>
            <span style={{ background: "#5b6bf0" }}>
              <Rss size={18} aria-hidden />
            </span>
            <b>Daily Digest</b>
            <small>{meetings.length} meetings</small>
          </div>
          <div className={styles.tile}>
            <span style={{ background: "#d85fa8" }}>
              <CalendarClock size={18} aria-hidden />
            </span>
            <b>Meeting Prep</b>
            <small>No upcoming meetings</small>
          </div>
          <div className={styles.tile}>
            <span style={{ background: "#7aa62b" }}>
              <Sparkles size={18} aria-hidden />
            </span>
            <b>Popular Topics</b>
            <small>{summaries} summaries</small>
          </div>
        </div>

        <div className={styles.connect}>
          <span>Connect Slack and Email — get richer insights with full context.</span>
          <Link href={ROUTES.integrations}>Connect →</Link>
        </div>

        <div className={styles.tabs} role="tablist">
          {TABS.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "upcoming" ? (
          <p className={styles.muted}>No upcoming meetings. Calendar sync is coming soon.</p>
        ) : isLoading ? (
          <div className={styles.skeletons}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={52} />
            ))}
          </div>
        ) : error ? (
          <div className={styles.muted} role="alert">
            <p>Can&apos;t reach the API. Start the backend with <code>uvicorn main:app --reload</code>, then try again.</p>
            <Button onClick={() => reload()}>Try again</Button>
          </div>
        ) : meetings.length === 0 ? (
          <p className={styles.muted}>No meetings yet. Use Capture to add one.</p>
        ) : (
          <ul className={styles.feed}>
            {meetings.slice(0, tab === "recent" ? 6 : 4).map((m) => (
              <li key={m.id}>
                <Link href={notebookHref(m.id)}>
                  <span className={styles.icon}>
                    <Video size={16} aria-hidden />
                  </span>
                  <span className={styles.text}>
                    <b>{m.title}</b>
                    <small>{rowMeta(m.date, m.duration)}</small>
                    {tab === "feed" && m.summary_snippet ? <em>{m.summary_snippet}</em> : null}
                  </span>
                  <AvatarStack people={m.participants} max={3} size={22} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
