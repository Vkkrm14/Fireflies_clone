"use client";

import { forwardRef, useState, type FormEvent } from "react";
import { Check, Copy, Pencil, Play, Plus, RefreshCw, Sparkles, Trash2, Video, X } from "lucide-react";
import { useSWRConfig } from "swr";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { useActionItems } from "@/lib/hooks/useActionItems";
import { useSoundbites } from "@/lib/hooks/useMeetingExtras";
import { usePlayerStore } from "@/lib/store/player";
import type { ActionItem, MeetingDetail } from "@/lib/types";
import { format } from "date-fns";
import styles from "./NotesPane.module.css";

type Tab = "notes" | "skills";

export interface NotesPaneProps {
  meeting: MeetingDetail;
  onTitleChange: (title: string) => Promise<void>;
  onTagsChanged: () => Promise<void>;
}

export const NotesPane = forwardRef<HTMLElement, NotesPaneProps>(function NotesPane({ meeting, onTitleChange, onTagsChanged }, tasksRef) {
  const toast = useToast();
  const { mutate } = useSWRConfig();
  const seekTo = usePlayerStore((s) => s.seekTo);
  const { items, add, update, remove } = useActionItems(meeting.id);
  const { soundbites, remove: removeSoundbite } = useSoundbites(meeting.id);
  const [tagDraft, setTagDraft] = useState("");
  const [tab, setTab] = useState<Tab>("notes");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(meeting.title);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ActionItem | null>(null);

  const host = meeting.participants.find((p) => p.role === "host") ?? meeting.participants[0];
  const summary = meeting.summary;
  const tasks: ActionItem[] = items ?? meeting.action_items;

  const saveTitle = async () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === meeting.title) {
      setTitleDraft(meeting.title);
      return;
    }
    try {
      await onTitleChange(next);
      toast.success("Title updated");
    } catch {
      setTitleDraft(meeting.title);
      toast.error("Could not update the title");
    }
  };

  const copySummary = async () => {
    const text = [
      summary?.overview ?? "",
      ...(summary?.chapters ?? []).map((c) => `- ${c.title} (${formatTimestamp(c.start_time)})`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Summary copied");
    } catch {
      toast.error("Could not copy the summary");
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await api.summary.generate(meeting.id);
      await mutate(["meeting", meeting.id]);
      toast.success("Summary regenerated");
    } catch (e) {
      toast.error("Could not regenerate", e instanceof Error ? e.message : undefined);
    } finally {
      setRegenerating(false);
    }
  };

  const saveTags = async (next: string[]) => {
    try {
      await api.tags.set(meeting.id, next);
      await mutate(["tags"]);
      await onTagsChanged();
    } catch {
      toast.error("Could not update tags");
    }
  };

  const addTag = async (event: FormEvent) => {
    event.preventDefault();
    const name = tagDraft.trim().toLowerCase();
    setTagDraft("");
    if (!name || meeting.tags.includes(name)) return;
    await saveTags([...meeting.tags, name]);
  };

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    setNewTask("");
    try {
      await add({ text });
      toast.success("Action item added");
    } catch {
      setNewTask(text);
      toast.error("Could not add the action item");
    }
  };

  const saveEdit = async (item: ActionItem) => {
    const text = editText.trim();
    setEditingId(null);
    if (!text || text === item.text) return;
    try {
      await update(item.id, { text });
      toast.success("Action item updated");
    } catch {
      toast.error("Could not update the action item");
    }
  };

  const toggle = async (item: ActionItem) => {
    try {
      await update(item.id, { is_completed: !item.is_completed });
      toast.success(item.is_completed ? "Marked as not done" : "Marked as done");
    } catch {
      toast.error("Could not update the action item");
    }
  };

  const del = async (item: ActionItem) => {
    setPendingDelete(null);
    try {
      await remove(item.id);
      toast.success("Action item deleted");
    } catch {
      toast.error("Could not delete the action item");
    }
  };

  return (
    <section className={styles.pane} aria-label="Meeting notes">
      <div className={styles.toggle} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "notes"} onClick={() => setTab("notes")}>Notes</button>
        <button type="button" role="tab" aria-selected={tab === "skills"} onClick={() => setTab("skills")}>
          AI Skills <span>0</span>
        </button>
      </div>

      <div className={styles.scroll}>
        <div className={styles.content}>
          <div className={styles.titleRow}>
            {editingTitle ? (
              <input
                className={styles.titleInput}
                value={titleDraft}
                autoFocus
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(meeting.title);
                    setEditingTitle(false);
                  }
                }}
                aria-label="Meeting title"
              />
            ) : (
              <h1 className={styles.title}>
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(meeting.title);
                    setEditingTitle(true);
                  }}
                  title="Click to rename"
                >
                  {meeting.title}
                  <Pencil size={14} aria-hidden />
                </button>
              </h1>
            )}
            <button
              type="button"
              className={styles.video}
              onClick={() => toast.info("No video for this meeting", "Recordings are placeholders in this build.")}
            >
              <Video size={15} aria-hidden /> Video
            </button>
          </div>

          <p className={styles.meta}>
            {host ? <Avatar name={host.name} color={host.avatar_color} size={20} /> : null}
            {host ? <u>{host.name}</u> : null}
            <span>{format(new Date(meeting.date), "MMM dd yyyy, h:mm a")}</span>
            <span className={styles.sep}>·</span>
            <span>English (Global)</span>
          </p>

          <div className={styles.tagRow}>
            {meeting.tags.map((t) => (
              <span key={t} className={styles.tag}>
                # {t}
                <button type="button" onClick={() => saveTags(meeting.tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <form onSubmit={addTag}>
              <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="+ Add tag" aria-label="Add tag" maxLength={32} />
            </form>
          </div>

          {tab === "skills" ? (
            <div className={styles.skills}>
              <Sparkles size={20} aria-hidden />
              <h2>No AI Skills run yet</h2>
              <p>AI Skills turn a meeting into follow-ups, emails and more. Coming soon.</p>
            </div>
          ) : (
            <>
              <div className={styles.summaryBar}>
                <span>
                  <Sparkles size={14} aria-hidden /> General Summary
                </span>
                <button type="button" onClick={copySummary} aria-label="Copy summary"><Copy size={15} /></button>
                <span className={styles.grow} />
                <button type="button" className={styles.refine} onClick={regenerate} disabled={regenerating || meeting.transcript_segments.length === 0}>
                  <RefreshCw size={13} className={regenerating ? styles.spin : undefined} aria-hidden /> Refine Summary
                </button>
              </div>

              <h2 className={styles.h2}>Notes</h2>
              {summary ? (
                <>
                  <h3 className={styles.h3}>Overview</h3>
                  <p className={styles.p}>{summary.overview}</p>

                  {summary.key_topics && summary.key_topics.length > 0 ? (
                    <>
                      <h3 className={styles.h3}>Key topics</h3>
                      <div className={styles.topics}>
                        {summary.key_topics.map((t) => <Badge key={t} tone="brand">{t}</Badge>)}
                      </div>
                    </>
                  ) : null}

                  {summary.chapters && summary.chapters.length > 0 ? (
                    <>
                      <h3 className={styles.h3}>Chapters</h3>
                      <ul className={styles.bullets}>
                        {summary.chapters.map((c) => (
                          <li key={`${c.title}-${c.start_time}`}>
                            <b>{c.title}</b>{" "}
                            <button type="button" onClick={() => seekTo(c.start_time)} aria-label={`Jump to ${c.title} at ${formatTimestamp(c.start_time)}`}>
                              ({formatTimestamp(c.start_time)})
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </>
              ) : (
                <p className={styles.p}>No summary yet. Use Refine Summary to generate one from the transcript.</p>
              )}

              {soundbites.length > 0 ? (
                <section aria-label="Soundbites">
                  <h3 className={styles.h3}>Soundbites</h3>
                  <ul className={styles.soundbites}>
                    {soundbites.map((s) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => seekTo(s.start_time)} aria-label={`Play soundbite ${s.title}`}>
                          <Play size={13} aria-hidden />
                        </button>
                        <span>{s.title}</span>
                        <small>{formatTimestamp(s.start_time)}-{formatTimestamp(s.end_time)}</small>
                        <button type="button" onClick={() => removeSoundbite(s.id).catch(() => toast.error("Could not delete the soundbite"))} aria-label={`Delete soundbite ${s.title}`}>
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section ref={tasksRef} className={styles.tasks} aria-label="Action items">
                <h3 className={styles.h3}>Action items</h3>
                <form onSubmit={addTask} className={styles.addTask}>
                  <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add an action item" aria-label="New action item" />
                  <button type="submit" disabled={!newTask.trim()}><Plus size={14} aria-hidden /> Add</button>
                </form>
                {tasks.length === 0 ? <p className={styles.muted}>No action items yet.</p> : null}
                <ul className={styles.taskList}>
                  {tasks.map((item) => (
                    <li key={item.id} data-done={item.is_completed || undefined}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.is_completed}
                        aria-label={`Mark "${item.text}" ${item.is_completed ? "not done" : "done"}`}
                        className={styles.check}
                        onClick={() => toggle(item)}
                      >
                        {item.is_completed ? <Check size={12} aria-hidden /> : null}
                      </button>
                      {editingId === item.id ? (
                        <input
                          className={styles.editInput}
                          value={editText}
                          autoFocus
                          onChange={(e) => setEditText(e.target.value)}
                          onBlur={() => saveEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(item);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          aria-label="Edit action item"
                        />
                      ) : (
                        <button
                          type="button"
                          className={styles.taskText}
                          title="Click to edit"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditText(item.text);
                          }}
                        >
                          {item.text}
                        </button>
                      )}
                      {item.assignee ? <Badge>{item.assignee}</Badge> : null}
                      <button type="button" className={styles.trash} onClick={() => setPendingDelete(item)} aria-label={`Delete "${item.text}"`}>
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
      <Modal
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this action item?"
        description={pendingDelete?.text}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => pendingDelete && del(pendingDelete)}>Delete</Button>
          </>
        }
      />
    </section>
  );
});
