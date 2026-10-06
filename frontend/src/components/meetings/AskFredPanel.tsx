"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp, Bookmark, Hash, Mic, MessageSquare, Plus, Sparkles, Target, X, Pin, SquareCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { usePlayerStore } from "@/lib/store/player";
import type { AskResponse } from "@/lib/types";
import { useUser } from "@/lib/hooks/useUser";
import styles from "./AskFredPanel.module.css";

export interface AskFredPanelProps {
  /** Heading under the greeting, e.g. "Get ready for your meeting" or "Ask anything about this meeting". */
  prompt: string;
  /** Scope chip shown in the composer, e.g. "My Meetings". Omit for meeting-level chat. */
  scope?: string;
  suggestions?: string[];
  bare?: boolean;
  /** When set, questions are answered from this meeting's transcript. */
  meetingId?: number;
}

const SUGGESTION_ICONS = [SquareCheck, Target, Pin, Bookmark];

interface Exchange {
  question: string;
  answer?: AskResponse;
  failed?: boolean;
}

export function AskFredPanel({ prompt, scope, suggestions = ["My action items", "Key decisions", "Key initiatives"], bare, meetingId }: AskFredPanelProps) {
  const { data: user } = useUser();
  const toast = useToast();
  const [showBanner, setShowBanner] = useState(true);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Exchange[]>([]);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const send = async (event?: FormEvent, override?: string) => {
    event?.preventDefault();
    const question = (override ?? draft).trim();
    if (!question) return;
    setDraft("");
    if (meetingId === undefined) {
      toast.info("Open a meeting to ask about it", "Cross-meeting questions are coming soon.");
      return;
    }
    const index = thread.length;
    setThread((t) => [...t, { question }]);
    try {
      const answer = await api.ask(meetingId, question);
      setThread((t) => t.map((x, i) => (i === index ? { ...x, answer } : x)));
    } catch {
      setThread((t) => t.map((x, i) => (i === index ? { ...x, failed: true } : x)));
    }
  };

  return (
    <section className={bare ? styles.panelBare : styles.panel} aria-label="AskFred">
      {!bare ? (
        <header className={styles.header}>
          <span className={styles.brand}>
            <Sparkles size={16} aria-hidden /> Ask Fred
          </span>
          <span className={styles.headerActions}>
            <button type="button" aria-label="Chat history"><MessageSquare size={16} /></button>
            <button type="button" aria-label="New chat"><Plus size={16} /></button>
          </span>
        </header>
      ) : null}

      <div className={styles.scroll}>
        {showBanner ? (
          <div className={styles.banner}>
            <div className={styles.bannerIcons} aria-hidden>
              <span>#</span>
              <span>M</span>
            </div>
            <div className={styles.bannerText}>
              <p>
                <b>Connect Slack and Gmail</b> — get answers with full context.
              </p>
              <a href="/integrations">Connect</a>
            </div>
            <button type="button" onClick={() => setShowBanner(false)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ) : null}

        {thread.length === 0 ? (
          <>
            <div className={styles.greeting}>
              <Sparkles size={22} className={styles.sparkle} aria-hidden />
              <h2>Hi {firstName}!</h2>
              <p>{prompt}</p>
            </div>

            <ul className={styles.chips}>
              {suggestions.map((text, i) => {
                const Icon = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length];
                return (
                  <li key={text}>
                    <button type="button" onClick={() => (meetingId === undefined ? setDraft(text) : send(undefined, text))}>
                      <Icon size={14} aria-hidden /> {text}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <ol className={styles.thread} aria-live="polite">
            {thread.map((x, i) => (
              <li key={i}>
                <p className={styles.question}>{x.question}</p>
                {x.failed ? (
                  <p className={styles.answer}>Could not reach the API. Try again.</p>
                ) : !x.answer ? (
                  <p className={styles.answer}>Searching the transcript…</p>
                ) : (
                  <div className={styles.answer}>
                    {x.answer.sources.length === 0 ? (
                      <p>{x.answer.answer}</p>
                    ) : (
                      <>
                        <p>Here is what the transcript says:</p>
                        <ul className={styles.sources}>
                          {x.answer.sources.map((s) => (
                            <li key={s.segment_id}>
                              <button type="button" onClick={() => seekTo(s.start_time)} aria-label={`Jump to ${formatTimestamp(s.start_time)}`}>
                                {formatTimestamp(s.start_time)}
                              </button>
                              <span>
                                <b>{s.speaker_name}:</b> {s.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <form className={styles.composer} onSubmit={send}>
        {scope ? (
          <span className={styles.scope}>
            <Hash size={13} aria-hidden /> {scope}
          </span>
        ) : null}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything. Type / to run AI skills."
          rows={2}
          aria-label="Ask Fred"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send();
          }}
        />
        <div className={styles.composerRow}>
          <button type="button" aria-label="Attach"><Plus size={16} /></button>
          <span className={styles.spacer} />
          <button type="button" aria-label="Dictate"><Mic size={16} /></button>
          <button type="submit" className={styles.send} aria-label="Send" disabled={!draft.trim()}>
            <ArrowUp size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
