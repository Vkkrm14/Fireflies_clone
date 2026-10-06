"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Maximize2, MessageSquare, Scissors, Search, Sparkles, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SearchHighlight } from "@/components/ui/SearchHighlight";
import { AskFredPanel } from "@/components/meetings/AskFredPanel";
import { useToast } from "@/components/ui/Toast";
import { useComments, useSoundbites } from "@/lib/hooks/useMeetingExtras";
import { formatTimestamp } from "@/lib/format";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { activeSegmentIndex, matchingSegments } from "@/lib/transcript";
import { usePlayerStore } from "@/lib/store/player";
import type { TranscriptSegment } from "@/lib/types";
import styles from "./TranscriptPane.module.css";

type Tab = "askfred" | "transcript";

export interface TranscriptPaneProps {
  meetingId: number;
  segments: TranscriptSegment[];
  query: string;
  onQueryChange: (query: string) => void;
}

export function TranscriptPane({ meetingId, segments, query, onQueryChange: setQuery }: TranscriptPaneProps) {
  const toast = useToast();
  const { comments, add: addComment, remove: removeComment } = useComments(meetingId);
  const { add: addSoundbite } = useSoundbites(meetingId);
  const [composerFor, setComposerFor] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<Tab>("transcript");
  const [cursor, setCursor] = useState(0);
  const [follow, setFollow] = useState(true);
  const debounced = useDebounce(query, 200);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const seekNonce = usePlayerStore((s) => s.seekRequest?.nonce ?? 0);
  const activeRef = useRef(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const matches = useMemo(() => matchingSegments(segments, debounced), [segments, debounced]);
  // An explicit seek (even to 00:00) counts as "started", so the clicked line stays highlighted while paused
  const active = isPlaying || currentTime > 0 || seekNonce > 0 ? activeSegmentIndex(segments, currentTime) : -1;
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const currentMatch = matches.length ? matches[Math.min(cursor, matches.length - 1)] : -1;

  // Keep the playing segment in view while audio plays
  useEffect(() => {
    if (tab !== "transcript" || !follow || !isPlaying || active < 0) return;
    itemRefs.current.get(active)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active, follow, isPlaying, tab]);

  // A click on a line, chapter or soundbite scrolls the transcript there even when playback is paused
  useEffect(() => {
    activeRef.current = active;
  });
  useEffect(() => {
    if (seekNonce === 0 || tab !== "transcript") return;
    itemRefs.current.get(activeRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [seekNonce, tab]);

  // Jump to the current search match
  useEffect(() => {
    if (currentMatch >= 0) itemRefs.current.get(currentMatch)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentMatch]);

  const submitComment = async (segmentId: number) => {
    const text = draft.trim();
    if (!text) return;
    try {
      await addComment(segmentId, text);
      setDraft("");
      setComposerFor(null);
    } catch {
      toast.error("Could not add the comment");
    }
  };

  const makeSoundbite = async (segment: TranscriptSegment) => {
    const title = segment.text.length > 48 ? `${segment.text.slice(0, 45)}...` : segment.text;
    try {
      await addSoundbite({ title, start_time: segment.start_time, end_time: segment.end_time });
      toast.success("Soundbite saved", "Find it under Soundbites in the notes.");
    } catch {
      toast.error("Could not save the soundbite");
    }
  };

  const step = (delta: number) => {
    if (matches.length === 0) return;
    setCursor((c) => (c + delta + matches.length) % matches.length);
  };

  return (
    <section className={styles.pane} aria-label="Transcript">
      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "askfred"} onClick={() => setTab("askfred")}>
          <Sparkles size={14} aria-hidden /> AskFred
        </button>
        <button type="button" role="tab" aria-selected={tab === "transcript"} onClick={() => setTab("transcript")}>
          Transcript
        </button>
        <span className={styles.spacer} />
        <button type="button" className={styles.icon} aria-label="Follow playback" onClick={() => setFollow((f) => !f)} title={follow ? "Auto-scroll on" : "Auto-scroll off"} aria-pressed={follow}>
          <Maximize2 size={15} />
        </button>
      </div>

      {tab === "askfred" ? (
        <AskFredPanel bare meetingId={meetingId} prompt="Ask anything about this meeting" suggestions={["What are the key decisions?", "Summarize my action items", "Who spoke the most?"]} />
      ) : (
        <>
          <div className={styles.find}>
            <Search size={14} aria-hidden />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              placeholder="Find or Replace"
              aria-label="Find in transcript"
              data-find-input
              onKeyDown={(e) => {
                if (e.key === "Enter") step(e.shiftKey ? -1 : 1);
              }}
            />
            {debounced.trim() ? (
              <span className={styles.counter} aria-live="polite">
                {matches.length === 0 ? "No matches" : `${Math.min(cursor, matches.length - 1) + 1} of ${matches.length} ${matches.length === 1 ? "line" : "lines"}`}
              </span>
            ) : null}
            <button type="button" onClick={() => step(-1)} disabled={matches.length === 0} aria-label="Previous match"><ChevronUp size={14} /></button>
            <button type="button" onClick={() => step(1)} disabled={matches.length === 0} aria-label="Next match"><ChevronDown size={14} /></button>
          </div>

          <div className={styles.list} ref={listRef}>
            {segments.length === 0 ? (
              <p className={styles.empty}>This meeting has no transcript yet.</p>
            ) : (
              segments.map((segment, i) => (
                <article
                  key={segment.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(i, el);
                    else itemRefs.current.delete(i);
                  }}
                  className={styles.block}
                  data-active={i === active || undefined}
                  data-match={matchSet.has(i) || undefined}
                  data-current={i === currentMatch || undefined}
                >
                  <header>
                    <Avatar name={segment.speaker_name} color={segment.speaker_color} size={20} />
                    <span className={styles.speaker}>{segment.speaker_name}</span>
                    <span className={styles.dot}>·</span>
                    <button type="button" className={styles.time} onClick={() => seekTo(segment.start_time)} aria-label={`Jump to ${formatTimestamp(segment.start_time)}`}>
                      {formatTimestamp(segment.start_time)}
                    </button>
                  </header>
                  <p onClick={() => seekTo(segment.start_time)}>
                    <SearchHighlight text={segment.text} query={debounced} />
                  </p>
                  <div className={styles.tools}>
                    <button type="button" onClick={() => { setComposerFor(composerFor === segment.id ? null : segment.id); setDraft(""); }} aria-label="Add a comment">
                      <MessageSquare size={13} aria-hidden /> Comment
                    </button>
                    <button type="button" onClick={() => makeSoundbite(segment)} aria-label="Create a soundbite from this line">
                      <Scissors size={13} aria-hidden /> Soundbite
                    </button>
                  </div>
                  {comments.filter((c) => c.segment_id === segment.id).map((c) => (
                    <div key={c.id} className={styles.comment}>
                      <p><b>{c.author}</b> {c.text}</p>
                      <button type="button" onClick={() => removeComment(c.id).catch(() => toast.error("Could not delete the comment"))} aria-label="Delete comment">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {composerFor === segment.id ? (
                    <form className={styles.composer} onSubmit={(e) => { e.preventDefault(); submitComment(segment.id); }}>
                      <input value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment" aria-label="Comment" />
                      <button type="submit" disabled={!draft.trim()}>Post</button>
                    </form>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
