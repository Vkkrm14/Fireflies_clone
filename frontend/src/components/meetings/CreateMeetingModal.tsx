"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { splitNames } from "@/lib/names";
import { notebookHref } from "@/lib/routes";
import { useUiStore } from "@/lib/store/ui";
import styles from "./CreateMeetingModal.module.css";

function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function CreateMeetingModal() {
  const open = useUiStore((s) => s.captureOpen);
  const setOpen = useUiStore((s) => s.setCaptureOpen);
  const router = useRouter();
  const toast = useToast();
  const { mutate } = useSWRConfig();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localNow);
  const [people, setPeople] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setDate(localNow());
    setPeople("");
    setText("");
    setFile(null);
    setError(null);
  };

  const names = splitNames(people);
  const valid = title.trim() && date && names.length > 0 && (file || text.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.set("title", title.trim());
    form.set("date", new Date(date).toISOString());
    form.set("participants", JSON.stringify(names));
    if (file) form.set("transcript_file", file);
    else form.set("transcript_text", text);
    try {
      const created = await api.meetings.create(form);
      await mutate((key) => Array.isArray(key) && key[0] === "meetings");
      toast.success("Meeting created", "Transcript parsed and summary generated.");
      setOpen(false);
      reset();
      router.push(notebookHref(created.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Add a meeting"
      description="Fireflies can't join live calls in this build. Paste or upload a transcript instead."
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="create-meeting" loading={submitting} disabled={!valid}>Create meeting</Button>
        </>
      }
    >
      <form id="create-meeting" className={styles.form} onSubmit={submit}>
        <label>
          <span>Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly product sync" required />
        </label>
        <div className={styles.row}>
          <label>
            <span>Date and time</span>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            <span>Participants</span>
            <Input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Ana, Bo, Chidi" required />
          </label>
        </div>
        <label>
          <span>Transcript</span>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"[00:00] Ana: Welcome everyone.\n[00:08] Bo: Thanks, let's start."}
            disabled={file !== null}
          />
        </label>
        <label className={styles.file}>
          <span>or upload a file (.txt, .vtt, .json)</span>
          <input type="file" accept=".txt,.vtt,.json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      </form>
    </Modal>
  );
}
