"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { AudioLines, Bookmark, Download, Ellipsis, FileText, Globe, Link as LinkIcon, MessageSquare, Menu, Pencil, Plus, Search, Trash2, WifiOff } from "lucide-react";
import { NotificationsMenu } from "@/components/layout/TopBar";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { api, exportUrl } from "@/lib/api";
import { useMeeting } from "@/lib/hooks/useMeeting";
import { useUser } from "@/lib/hooks/useUser";
import { notebookHref, ROUTES, viewHref } from "@/lib/routes";
import { parseSeekParam } from "@/lib/searchGroups";
import { useUiStore } from "@/lib/store/ui";
import { downloadText, transcriptToText } from "@/lib/transcriptText";
import { ActivityPanel } from "./ActivityPanel";
import { NotesPane } from "./NotesPane";
import { PlayerBar } from "./PlayerBar";
import { SmartSearchPanel } from "./SmartSearchPanel";
import { TranscriptPane } from "./TranscriptPane";
import styles from "./MeetingNotebook.module.css";

type Panel = "search" | "comments" | "soundbites";

export function MeetingNotebook({ meetingId }: { meetingId: number | null }) {
  const router = useRouter();
  const toast = useToast();
  const { mutate } = useSWRConfig();
  const { data: user } = useUser();
  const setCaptureOpen = useUiStore((s) => s.setCaptureOpen);
  const { data: meeting, error, isLoading, mutate: reload } = useMeeting(meetingId);
  const tasksRef = useRef<HTMLElement>(null);
  // Wide screens start with Smart Search open; narrower ones show panels as an overlay, so start closed
  const [panel, setPanel] = useState<Panel | null>(() =>
    typeof window === "undefined" || window.matchMedia("(min-width: 1181px)").matches ? "search" : null,
  );
  // Search results deep-link here with ?t=<seconds>; the player jumps there once it is ready
  const startAt = useMemo(
    () => (meetingId === null || typeof window === "undefined" ? null : parseSeekParam(window.location.search)),
    [meetingId],
  );

  const togglePanel = (next: Panel) => setPanel((current) => (current === next ? null : next));
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const share = async () => {
    if (!meeting) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${viewHref(meeting)}`);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const download = () => {
    if (!meeting) return;
    if (meeting.transcript_segments.length === 0) {
      toast.info("Nothing to download", "This meeting has no transcript yet.");
      return;
    }
    downloadText(`${meeting.title}.txt`, transcriptToText(meeting.title, meeting.transcript_segments));
  };

  const refreshMeeting = async () => {
    await reload();
    await mutate((key) => Array.isArray(key) && key[0] === "meetings");
  };

  const exportAs = (kind: "transcript" | "summary", format: "txt" | "md" | "json") => () => {
    if (meeting) window.location.assign(exportUrl(meeting.id, kind, format));
  };

  const rename = async (title: string) => {
    if (!meeting) return;
    await api.meetings.update(meeting.id, { title });
    await reload();
    await mutate((key) => Array.isArray(key) && key[0] === "meetings");
  };

  const remove = async () => {
    if (!meeting) return;
    setDeleting(true);
    try {
      await api.meetings.remove(meeting.id);
      await mutate((key) => Array.isArray(key) && key[0] === "meetings");
      toast.success("Meeting deleted");
      router.push(ROUTES.meetings);
    } catch {
      toast.error("Could not delete the meeting");
      setDeleting(false);
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <Link href={ROUTES.meetings} className={styles.iconBtn} aria-label="Back to meetings">
          <Menu size={18} />
        </Link>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href={notebookHref("all")}>#All Meetings</Link>
          <span>/</span>
          <span className={styles.crumbCurrent}>{meeting?.title ?? (isLoading ? "Loading…" : "Meeting")}</span>
        </nav>
        {meeting ? (
          <ActionMenu
            align="start"
            trigger={
              <button type="button" className={styles.iconBtn} aria-label="Meeting actions">
                <Ellipsis size={16} />
              </button>
            }
            items={[
              { label: "Edit details", icon: <Pencil size={14} />, onSelect: () => setEditOpen(true) },
              { label: "Download transcript (.txt)", icon: <Download size={14} />, onSelect: exportAs("transcript", "txt"), separatorBefore: true },
              { label: "Download transcript (.md)", icon: <FileText size={14} />, onSelect: exportAs("transcript", "md") },
              { label: "Download summary (.md)", icon: <FileText size={14} />, onSelect: exportAs("summary", "md") },
              { label: "Copy link", icon: <LinkIcon size={14} />, onSelect: share },
              { label: "Delete meeting", icon: <Trash2 size={14} />, onSelect: () => setConfirmDelete(true), danger: true, separatorBefore: true },
            ]}
          />
        ) : null}
        <span className={styles.grow} />
        <Link href={ROUTES.upgrade} className={styles.upgrade}>Upgrade</Link>
        <div className={styles.share}>
          <button type="button" onClick={share} disabled={!meeting}><Globe size={15} aria-hidden /> Share</button>
          <button type="button" onClick={share} disabled={!meeting} aria-label="Copy link"><LinkIcon size={15} /></button>
        </div>
        <button type="button" className={styles.iconBtn} onClick={() => setCaptureOpen(true)} aria-label="Add a meeting"><Plus size={18} /></button>
        <NotificationsMenu />
        <Avatar name={user?.name ?? "You"} src={user?.avatar_url} size={32} />
      </header>

      {error ? (
        <div className={styles.state}>
          <EmptyState
            icon={<WifiOff size={22} />}
            title={error.status === 404 ? "Meeting not found" : "Can't reach the API"}
            description={error.status === 404 ? "It may have been deleted." : "Start the backend with uvicorn main:app --reload, then try again."}
            action={
              error.status === 404 ? (
                <Link href={ROUTES.meetings}><Button>Back to meetings</Button></Link>
              ) : (
                <Button onClick={() => reload()}>Try again</Button>
              )
            }
          />
        </div>
      ) : meetingId === null ? (
        <div className={styles.state}>
          <EmptyState title="Meeting not found" description="This link doesn't point to a meeting." action={<Link href={ROUTES.meetings}><Button>Back to meetings</Button></Link>} />
        </div>
      ) : isLoading || !meeting ? (
        <div className={styles.loading} aria-busy="true">
          <Skeleton width={320} height={30} />
          <Skeleton width={220} height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="92%" height={14} />
          <Skeleton width="84%" height={14} />
        </div>
      ) : (
        <>
          <div className={styles.body} data-panel={panel ? panel : undefined}>
            <nav className={styles.rail} aria-label="Meeting tools">
              <button type="button" aria-pressed={panel === "search"} onClick={() => togglePanel("search")} aria-label="Smart Search" title="Smart Search"><Search size={17} /></button>
              <button type="button" aria-pressed={panel === "search"} onClick={() => setPanel("search")} aria-label="Speakers" title="Speakers"><AudioLines size={17} /></button>
              <button type="button" aria-pressed={panel === "comments"} onClick={() => togglePanel("comments")} aria-label="Comments" title="Comments"><MessageSquare size={17} /></button>
              <button type="button" aria-pressed={panel === "soundbites"} onClick={() => togglePanel("soundbites")} aria-label="Soundbites" title="Soundbites"><Bookmark size={17} /></button>
            </nav>
            {panel ? (
              <aside className={styles.left} aria-label={panel === "search" ? "Smart Search" : panel === "comments" ? "Comments" : "Soundbites"}>
                {panel === "search" ? (
                  <SmartSearchPanel
                    meeting={meeting}
                    onFilter={setQuery}
                    onTasks={() => tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  />
                ) : (
                  <ActivityPanel mode={panel} meetingId={meeting.id} segments={meeting.transcript_segments} />
                )}
              </aside>
            ) : null}
            <div className={styles.center}>
              <NotesPane ref={tasksRef} meeting={meeting} onTitleChange={rename} onTagsChanged={refreshMeeting} />
            </div>
            <div className={styles.right}>
              <TranscriptPane meetingId={meeting.id} segments={meeting.transcript_segments} query={query} onQueryChange={setQuery} />
            </div>
          </div>
          <PlayerBar mediaUrl={meeting.media_url} duration={meeting.duration} onDownload={download} startAt={startAt} />
        </>
      )}

      {meeting ? <EditMeetingModal meeting={meeting} open={editOpen} onOpenChange={setEditOpen} onSaved={refreshMeeting} /> : null}

      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this meeting?"
        description="This permanently deletes the meeting, its transcript, summary and action items."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={remove}>Delete</Button>
          </>
        }
      />
    </div>
  );
}
