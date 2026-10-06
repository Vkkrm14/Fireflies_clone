"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { splitNames, toLocalInput } from "@/lib/names";
import type { MeetingDetail } from "@/lib/types";
import styles from "./CreateMeetingModal.module.css";

export interface EditMeetingModalProps {
  meeting: MeetingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}

export function EditMeetingModal({ meeting, open, onOpenChange, onSaved }: EditMeetingModalProps) {
  const toast = useToast();
  const [title, setTitle] = useState(meeting.title);
  const [date, setDate] = useState(toLocalInput(meeting.date));
  const [people, setPeople] = useState(meeting.participants.map((p) => p.name).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form each time it opens, so a cancelled edit never leaks into the next one.
  // Adjusting state during render (not in an effect) is the pattern React recommends for this.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(meeting.title);
      setDate(toLocalInput(meeting.date));
      setPeople(meeting.participants.map((p) => p.name).join(", "));
      setError(null);
    }
  }

  const names = splitNames(people);
  const valid = title.trim() && date && names.length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await api.meetings.update(meeting.id, { title: title.trim(), date: new Date(date).toISOString(), participants: names });
      await onSaved();
      toast.success("Meeting updated");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit meeting details"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="edit-meeting" loading={saving} disabled={!valid}>Save changes</Button>
        </>
      }
    >
      <form id="edit-meeting" className={styles.form} onSubmit={submit}>
        <label>
          <span>Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
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
        <p className={styles.hint}>The first participant is the host. Duration comes from the transcript.</p>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      </form>
    </Modal>
  );
}
