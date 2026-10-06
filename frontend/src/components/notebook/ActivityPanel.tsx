"use client";

import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatTimestamp } from "@/lib/format";
import { useComments, useSoundbites } from "@/lib/hooks/useMeetingExtras";
import { usePlayerStore } from "@/lib/store/player";
import type { TranscriptSegment } from "@/lib/types";
import styles from "./ActivityPanel.module.css";

export interface ActivityPanelProps {
  mode: "comments" | "soundbites";
  meetingId: number;
  segments: TranscriptSegment[];
}

/** Lists every comment or soundbite of a meeting; clicking one jumps the player and transcript to it. */
export function ActivityPanel({ mode, meetingId, segments }: ActivityPanelProps) {
  const toast = useToast();
  const seekTo = usePlayerStore((s) => s.seekTo);
  const { comments, remove: removeComment } = useComments(meetingId);
  const { soundbites, remove: removeSoundbite } = useSoundbites(meetingId);
  const segmentById = new Map(segments.map((s) => [s.id, s]));

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>{mode === "comments" ? "Comments" : "Soundbites"}</h2>

      {mode === "comments" ? (
        comments.length === 0 ? (
          <p className={styles.empty}>No comments yet. Use “Comment” under any transcript line to start a thread.</p>
        ) : (
          <ul className={styles.list}>
            {comments.map((c) => {
              const segment = segmentById.get(c.segment_id);
              return (
                <li key={c.id}>
                  <button type="button" className={styles.item} onClick={() => segment && seekTo(segment.start_time)}>
                    <span className={styles.meta}>
                      {c.author}
                      {segment ? ` · ${formatTimestamp(segment.start_time)}` : ""}
                    </span>
                    <span className={styles.text}>{c.text}</span>
                    {segment ? <span className={styles.quote}>{segment.text}</span> : null}
                  </button>
                  <button
                    type="button"
                    className={styles.trash}
                    aria-label="Delete comment"
                    onClick={() => removeComment(c.id).catch(() => toast.error("Could not delete the comment"))}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : soundbites.length === 0 ? (
        <p className={styles.empty}>No soundbites yet. Use “Soundbite” under a transcript line to save a clip.</p>
      ) : (
        <ul className={styles.list}>
          {soundbites.map((b) => (
            <li key={b.id}>
              <button type="button" className={styles.item} onClick={() => seekTo(b.start_time)}>
                <span className={styles.meta}>
                  {formatTimestamp(b.start_time)} – {formatTimestamp(b.end_time)}
                </span>
                <span className={styles.text}>{b.title}</span>
              </button>
              <button
                type="button"
                className={styles.trash}
                aria-label={`Delete soundbite "${b.title}"`}
                onClick={() => removeSoundbite(b.id).catch(() => toast.error("Could not delete the soundbite"))}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
