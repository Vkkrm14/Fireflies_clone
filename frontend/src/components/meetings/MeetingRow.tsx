"use client";

import Link from "next/link";
import { ChevronRight, Copy, Download, Ellipsis, FolderInput, Share2, Trash2, Type } from "lucide-react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { SearchHighlight } from "@/components/ui/SearchHighlight";
import { avatarColor } from "@/lib/avatar";
import { rowMeta } from "@/lib/groupByDay";
import { notebookHref } from "@/lib/routes";
import type { MeetingListItem } from "@/lib/types";
import styles from "./MeetingRow.module.css";

export interface MeetingRowProps {
  meeting: MeetingListItem;
  query?: string;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onShare: () => void;
  onCopyLink: () => void;
  onDownload: () => void;
  onMove: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function MeetingRow({ meeting, query = "", selected, onSelect, onShare, onCopyLink, onDownload, onMove, onRename, onDelete }: MeetingRowProps) {
  const host = meeting.participants.find((p) => p.role === "host") ?? meeting.participants[0];
  const tile = avatarColor(meeting.title);
  const href = notebookHref(meeting.id);

  return (
    <li className={styles.row} data-selected={selected || undefined}>
      <input
        type="checkbox"
        className={styles.check}
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        aria-label={`Select ${meeting.title}`}
      />
      <Link href={href} className={styles.main}>
        <span className={styles.tile} style={{ background: tile }} aria-hidden>
          {meeting.title.trim()[0]?.toUpperCase() ?? "M"}
        </span>
        <span className={styles.text}>
          <span className={styles.title}>
            <SearchHighlight text={meeting.title} query={query} />
            <ChevronRight size={14} aria-hidden />
          </span>
          <span className={styles.meta}>
            {rowMeta(meeting.date, meeting.duration)}
            {host ? <> · {host.name}</> : null}
          </span>
          {meeting.summary_snippet ? <span className={styles.snippet}>{meeting.summary_snippet}</span> : null}
          {meeting.tags.length > 0 ? (
            <span className={styles.tags}>
              {meeting.tags.map((t) => (
                <span key={t}># {t}</span>
              ))}
            </span>
          ) : null}
        </span>
      </Link>
      <span className={styles.actions}>
        <ActionMenu
          trigger={
            <button type="button" className={styles.more} aria-label={`More actions for ${meeting.title}`}>
              <Ellipsis size={16} />
            </button>
          }
          items={[
            { label: "Share", icon: <Share2 size={14} />, onSelect: onShare },
            { label: "Copy Link", icon: <Copy size={14} />, onSelect: onCopyLink },
            { label: "Download", icon: <Download size={14} />, onSelect: onDownload },
            { label: "Move to channel", icon: <FolderInput size={14} />, onSelect: onMove },
            { label: "Rename", icon: <Type size={14} />, onSelect: onRename },
            { label: "Delete", icon: <Trash2 size={14} />, onSelect: onDelete, danger: true, separatorBefore: true },
          ]}
        />
        <Link href={href} className={styles.details}>
          Details <ChevronRight size={14} aria-hidden />
        </Link>
      </span>
    </li>
  );
}
