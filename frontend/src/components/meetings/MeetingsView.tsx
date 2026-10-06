"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import { Search, SlidersHorizontal, Video, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { groupByDay } from "@/lib/groupByDay";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { useTags } from "@/lib/hooks/useMeetingExtras";
import { channelLabel, viewHref } from "@/lib/routes";
import { useUiStore } from "@/lib/store/ui";
import { downloadText, transcriptToText } from "@/lib/transcriptText";
import type { MeetingListItem, MeetingSort } from "@/lib/types";
import { AskFredPanel } from "./AskFredPanel";
import { ChannelsPanel } from "./ChannelsPanel";
import { MeetingRow } from "./MeetingRow";
import styles from "./MeetingsView.module.css";

type Scope = "hosted" | "shared";
type DateRange = "all" | "today" | "week" | "month";

const SORT_OPTIONS: { value: MeetingSort; label: string }[] = [
  { value: "newest", label: "Most recent" },
  { value: "oldest", label: "Oldest first" },
  { value: "longest", label: "Longest" },
  { value: "shortest", label: "Shortest" },
];

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];

function dateFrom(range: DateRange): string | undefined {
  if (range === "all") return undefined;
  const d = new Date();
  if (range === "today") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - (range === "week" ? 7 : 30));
  return d.toISOString();
}

function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <div className={styles.ghostRows} aria-hidden>
        {["K", "A", "R"].map((l) => (
          <span key={l}>
            <i>{l}</i>
            <b />
          </span>
        ))}
      </div>
      {icon ? <span className={styles.emptyIcon}>{icon}</span> : null}
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function MeetingsView({ channelId }: { channelId: string }) {
  const toast = useToast();
  const { mutate } = useSWRConfig();
  const setCaptureOpen = useUiStore((s) => s.setCaptureOpen);

  const [scope, setScope] = useState<Scope>("hosted");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<MeetingSort>("newest");
  const [range, setRange] = useState<DateRange>("all");
  const [participant, setParticipant] = useState("all");
  const [tag, setTag] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [renaming, setRenaming] = useState<MeetingListItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<MeetingListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const debounced = useDebounce(query.trim(), 300);
  const params = useMemo(
    () => ({
      search: debounced || undefined,
      sort,
      date_from: dateFrom(range),
      participant: participant === "all" ? undefined : participant,
      tag: tag === "all" ? undefined : tag,
      page_size: 100,
    }),
    [debounced, sort, range, participant, tag],
  );
  const { data, error, isLoading, mutate: refresh } = useMeetings(params);
  const { data: everything } = useMeetings({ page_size: 100 });
  const { data: tagCounts } = useTags();

  const participantOptions = useMemo(() => {
    const names = new Set<string>();
    everything?.meetings.forEach((m) => m.participants.forEach((p) => names.add(p.name)));
    return [{ value: "all", label: "Everyone" }, ...[...names].sort().map((n) => ({ value: n, label: n }))];
  }, [everything]);

  const channelHasMeetings = channelId === "mine-shared" || channelId === "all" || channelId === "uploads";
  const meetings = data?.meetings;
  const visible = useMemo(() => (channelHasMeetings && scope === "hosted" ? (meetings ?? []) : []), [channelHasMeetings, scope, meetings]);
  const byDate = sort === "newest" || sort === "oldest";
  const groups = useMemo(
    () => (byDate ? groupByDay(visible) : [{ key: sort, label: sort === "longest" ? "Longest first" : "Shortest first", items: visible }]),
    [byDate, sort, visible],
  );
  const tagOptions = useMemo(
    () => [{ value: "all", label: "Any tag" }, ...(tagCounts ?? []).map((t) => ({ value: t.name, label: `# ${t.name} (${t.count})` }))],
    [tagCounts],
  );
  const activeFilters = (range !== "all" ? 1 : 0) + (participant !== "all" ? 1 : 0) + (sort !== "newest" ? 1 : 0) + (tag !== "all" ? 1 : 0);
  const refreshAll = () => mutate((key) => Array.isArray(key) && key[0] === "meetings");

  const copyLink = async (m: MeetingListItem) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${viewHref(m)}`);
      toast.success("Link copied", "Anyone with access to this app can open it.");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const download = async (m: MeetingListItem) => {
    try {
      const segments = await api.transcript.list(m.id);
      if (segments.length === 0) {
        toast.info("Nothing to download", "This meeting has no transcript yet.");
        return;
      }
      downloadText(`${m.title}.txt`, transcriptToText(m.title, segments));
    } catch {
      toast.error("Download failed", "Could not load the transcript.");
    }
  };

  const confirmRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    setBusy(true);
    try {
      await api.meetings.update(renaming.id, { title: renameValue.trim() });
      await refreshAll();
      toast.success("Meeting renamed");
      setRenaming(null);
    } catch {
      toast.error("Could not rename the meeting");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.meetings.remove(deleting.id);
      await refreshAll();
      toast.success("Meeting deleted");
      setDeleting(null);
    } catch {
      toast.error("Could not delete the meeting");
    } finally {
      setBusy(false);
    }
  };

  const toggleSelected = (id: number, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className={styles.layout}>
      <ChannelsPanel activeId={channelId} />

      <section className={styles.list} aria-label={channelLabel(channelId)}>
        {channelId === "uploads" ? (
          <button type="button" className={styles.drop} onClick={() => setCaptureOpen(true)}>
            <span className={styles.dropIcon} aria-hidden>↑</span>
            <b>Upload audio or video recordings</b>
            <span>Transcripts (.txt, .vtt, .json) are supported in this build.</span>
            <span className={styles.browse}>Browse Files</span>
          </button>
        ) : null}

        <div className={styles.toolbar}>
          <div className={styles.segmented} role="group" aria-label="Meeting scope">
            <button type="button" aria-pressed={scope === "hosted"} onClick={() => setScope("hosted")}>Hosted by me</button>
            <button type="button" aria-pressed={scope === "shared"} onClick={() => setScope("shared")}>Shared with me</button>
          </div>
          <button type="button" className={styles.filters} onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={14} aria-hidden /> Filters
            {activeFilters > 0 ? <span className={styles.count}>{activeFilters}</span> : null}
          </button>
          <span className={styles.spacer} />
          {searchOpen ? (
            <label className={styles.inlineSearch}>
              <Search size={14} aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search meetings"
                aria-label="Search meetings"
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
              >
                <X size={14} />
              </button>
            </label>
          ) : (
            <button type="button" className={styles.iconButton} onClick={() => setSearchOpen(true)} aria-label="Search meetings">
              <Search size={16} />
            </button>
          )}
        </div>

        <div className={styles.scroll}>
          {channelId === "autopilot" ? (
            <Empty title="No voice agent meetings yet" text="Calls handled by Fireflies Voice Agents will show up here." />
          ) : isLoading ? (
            <ul className={styles.rows} aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className={styles.skeleton}>
                  <Skeleton width={32} height={32} />
                  <div>
                    <Skeleton width={220} height={14} />
                    <div style={{ marginTop: 8 }}>
                      <Skeleton width={140} height={11} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : error ? (
            <Empty
              icon={<WifiOff size={22} />}
              title="Can't reach the API"
              text="Start the backend with uvicorn main:app --reload from the backend folder, then try again."
              action={<Button onClick={() => refresh()}>Try again</Button>}
            />
          ) : visible.length === 0 ? (
            debounced || activeFilters > 0 ? (
              <Empty
                icon={<Search size={22} />}
                title="No meetings match"
                text="Try a different search or clear the filters."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setRange("all");
                      setParticipant("all");
                      setTag("all");
                      setSort("newest");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <Empty
                icon={<Video size={22} />}
                title={scope === "shared" ? "Nothing has been shared with you" : "Looks like you haven't recorded a meeting yet"}
                text={scope === "shared" ? "Meetings teammates share with you will appear here." : "Add a meeting with a transcript and it'll show up right here."}
                action={scope === "hosted" ? <Button onClick={() => setCaptureOpen(true)}>+ Capture</Button> : undefined}
              />
            )
          ) : (
            <>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <h2 className={styles.day}>{group.label}</h2>
                  <ul className={styles.rows}>
                    {group.items.map((meeting) => (
                      <MeetingRow
                        key={meeting.id}
                        meeting={meeting}
                        query={debounced}
                        selected={selected.has(meeting.id)}
                        onSelect={(on) => toggleSelected(meeting.id, on)}
                        onShare={() => copyLink(meeting)}
                        onCopyLink={() => copyLink(meeting)}
                        onDownload={() => download(meeting)}
                        onMove={() => toast.info("Channels are coming soon", "Moving meetings between channels isn't available yet.")}
                        onRename={() => {
                          setRenaming(meeting);
                          setRenameValue(meeting.title);
                        }}
                        onDelete={() => setDeleting(meeting)}
                      />
                    ))}
                  </ul>
                </Fragment>
              ))}
              <p className={styles.end}>You&apos;ve reached the end of your meetings.</p>
            </>
          )}
        </div>
      </section>

      <div className={styles.ask}>
        <AskFredPanel prompt="Get ready for your meeting" scope={channelLabel(channelId)} />
      </div>

      <Modal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
        description="Narrow the meetings in this list."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRange("all");
                setParticipant("all");
                setTag("all");
                setSort("newest");
              }}
            >
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Done</Button>
          </>
        }
      >
        <div className={styles.filterBody}>
          <Dropdown label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
          <Dropdown label="Date" value={range} options={DATE_OPTIONS} onChange={setRange} />
          <Dropdown label="Participant" value={participant} options={participantOptions} onChange={setParticipant} />
          <Dropdown label="Tag" value={tag} options={tagOptions} onChange={setTag} />
        </div>
      </Modal>

      <Modal
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title="Rename meeting"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button loading={busy} disabled={!renameValue.trim()} onClick={confirmRename}>Save</Button>
          </>
        }
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          aria-label="Meeting title"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && confirmRename()}
        />
      </Modal>

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this meeting?"
        description="This permanently deletes the meeting, its transcript, summary and action items."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className={styles.confirmName}>{deleting?.title}</p>
      </Modal>
    </div>
  );
}
