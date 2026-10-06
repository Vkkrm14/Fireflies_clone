"use client";

import Link from "next/link";
import { Building2, Hash, Plus, Search, Upload, Video } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { CHANNELS, notebookHref } from "@/lib/routes";
import styles from "./ChannelsPanel.module.css";

const ICONS: Record<string, typeof Hash> = {
  "mine-shared": Hash,
  all: Building2,
  autopilot: Video,
  uploads: Upload,
};

export function ChannelsPanel({ activeId }: { activeId: string }) {
  const toast = useToast();
  const createChannel = () => toast.info("Channels are coming soon", "Custom channels will let you group meetings by team or project.");

  return (
    <aside className={styles.panel} aria-label="Channels">
      <label className={styles.search}>
        <Search size={14} aria-hidden />
        <input placeholder="Search channels" aria-label="Search channels" />
      </label>

      <nav>
        <ul className={styles.list}>
          {CHANNELS.map((channel) => {
            const Icon = ICONS[channel.id] ?? Hash;
            return (
              <li key={channel.id}>
                <Link
                  href={notebookHref(channel.id)}
                  className={styles.item}
                  aria-current={channel.id === activeId ? "page" : undefined}
                >
                  <Icon size={15} aria-hidden />
                  <span>{channel.label}</span>
                  {channel.id === "uploads" ? <em className={styles.new}>NEW</em> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.all}>
        <div className={styles.allHeader}>
          <span>All channels</span>
        </div>
        <div className={styles.empty}>
          <Hash size={20} aria-hidden />
          <p>Create channels to organize your conversations</p>
          <button type="button" onClick={createChannel}>
            <Plus size={14} aria-hidden /> Channel
          </button>
        </div>
      </div>
    </aside>
  );
}
