"use client";

import { useMemo } from "react";
import { ChevronUp } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useActionItems } from "@/lib/hooks/useActionItems";
import { speakerStats } from "@/lib/transcript";
import type { MeetingDetail } from "@/lib/types";
import styles from "./SmartSearchPanel.module.css";

export interface SmartSearchPanelProps {
  meeting: MeetingDetail;
  onFilter: (query: string) => void;
  onTasks: () => void;
}

export function SmartSearchPanel({ meeting, onFilter, onTasks }: SmartSearchPanelProps) {
  // Same SWR key as the notes pane, so the badge follows adds and deletes immediately
  const { items } = useActionItems(meeting.id);
  const taskCount = (items ?? meeting.action_items).length;
  const segments = meeting.transcript_segments;
  const stats = useMemo(() => speakerStats(segments), [segments]);
  const counts = useMemo(
    () => ({
      questions: segments.filter((s) => s.text.includes("?")).length,
      // Counts exactly what the "%" filter finds, so the badge and the result list agree
      metrics: segments.filter((s) => s.text.includes("%")).length,
    }),
    [segments],
  );

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Smart Search</h2>

      <section className={styles.section}>
        <header>
          <span>AI FILTERS</span>
          <ChevronUp size={14} aria-hidden />
        </header>
        <div className={styles.filters}>
          <button type="button" onClick={() => onFilter("?")} disabled={counts.questions === 0}>
            <i style={{ background: "#c4568a" }} /> Questions <b>{counts.questions}</b>
          </button>
          <button type="button" onClick={() => onFilter("%")} disabled={counts.metrics === 0}>
            <i style={{ background: "#5b8def" }} /> Metrics <b>{counts.metrics}</b>
          </button>
          <button type="button" onClick={onTasks}>
            <i style={{ background: "#d28b3a" }} /> Tasks <b>{taskCount}</b>
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <header>
          <span>SPEAKER TALKTIME</span>
          <ChevronUp size={14} aria-hidden />
        </header>
        <div className={styles.speakers}>
          <div className={styles.speakerHead}>
            <span>SPEAKERS</span>
            <span>WPM</span>
            <span>TALKTIME</span>
          </div>
          {stats.map((stat) => (
            <div key={stat.name} className={styles.speaker}>
              <span className={styles.name}>
                <Avatar name={stat.name} color={stat.color} size={20} />
                {stat.name}
              </span>
              <span className={styles.wpm}>
                <i /> {stat.wpm}
              </span>
              <span className={styles.share}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="var(--bg-strong)" strokeWidth="3" />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="var(--brand-light)"
                    strokeWidth="3"
                    strokeDasharray={`${(stat.share / 100) * 56.5} 56.5`}
                    transform="rotate(-90 12 12)"
                  />
                </svg>
                {stat.share}%
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
