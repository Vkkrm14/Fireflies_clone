"use client";

import { useState } from "react";
import { ArrowUpDown, Plus, Trash2, Video } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, SearchInput, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchHighlight } from "@/components/ui/SearchHighlight";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { MeetingSort } from "@/lib/types";
import styles from "./design-system.module.css";

const SWATCHES = [
  "--primary-50", "--primary-100", "--primary-200", "--primary-500", "--primary-600", "--primary-700",
  "--gray-50", "--gray-100", "--gray-200", "--gray-300", "--gray-400", "--gray-600", "--gray-800", "--gray-900",
  "--sidebar-bg", "--success", "--warning", "--danger", "--info",
];

const SORT_OPTIONS: Array<{ value: MeetingSort; label: string }> = [
  { value: "newest", label: "Most recent" },
  { value: "oldest", label: "Oldest first" },
  { value: "longest", label: "Longest" },
  { value: "shortest", label: "Shortest" },
];

const PEOPLE = ["Sarah Chen", "Marcus Williams", "Priya Patel", "Tom Richards", "Ravi Menon", "Ana Souza"];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note ? <p className={styles.sectionNote}>{note}</p> : null}
      </div>
      <div className={styles.demo}>{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [sort, setSort] = useState<MeetingSort>("newest");
  const [query, setQuery] = useState("roadmap");

  return (
    <PageContainer title="Design system" description="Tokens and shared components used across the app." width="wide">
      <Section title="Colour" note="Defined once as CSS variables in globals.css.">
        <div className={styles.swatches}>
          {SWATCHES.map((token) => (
            <div key={token}>
              <div className={styles.swatch} style={{ background: `var(${token})` }} />
              <p className={styles.swatchName}>{token.slice(2)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" note="DM Sans for headings, Inter for body text.">
        <div className={styles.stack}>
          <h1 style={{ fontSize: "var(--fs-2xl)" }}>Q3 product roadmap review</h1>
          <h3 style={{ fontSize: "var(--fs-lg)" }}>Key topics and chapters</h3>
          <p>Marcus will compare pgvector and a hosted vector database and share the spec by Friday.</p>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>Last updated 3 hours ago</p>
        </div>
      </Section>

      <Section title="Buttons" note="Four variants, three sizes, plus loading, disabled and icon-only.">
        <Button leftIcon={<Plus size={16} />}>New meeting</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="danger" leftIcon={<Trash2 size={16} />}>Delete meeting</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button loading>Saving</Button>
        <Button disabled>Disabled</Button>
        <Button variant="secondary" iconOnly aria-label="Add action item"><Plus size={18} /></Button>
      </Section>

      <Section title="Inputs">
        <div className={styles.stack}>
          <Input placeholder="Meeting title" aria-label="Meeting title" />
          <Input icon={<Video size={16} />} placeholder="Meeting link" aria-label="Meeting link" />
          <Input invalid defaultValue="" placeholder="Title is required" aria-label="Title" />
          <SearchInput value={query} onValueChange={setQuery} placeholder="Search meetings" aria-label="Search meetings" />
          <Textarea placeholder="Paste a transcript" aria-label="Transcript" />
        </div>
      </Section>

      <Section title="Badges and avatars">
        <Badge>Neutral</Badge>
        <Badge tone="brand">Roadmap</Badge>
        <Badge tone="success" dot>Completed</Badge>
        <Badge tone="warning" dot>In progress</Badge>
        <Badge tone="danger">Overdue</Badge>
        <Badge tone="info">Sync</Badge>
        {PEOPLE.slice(0, 5).map((name) => (
          <Avatar key={name} name={name} />
        ))}
        <AvatarStack people={PEOPLE.map((name) => ({ name }))} max={4} />
      </Section>

      <Section title="Menus, dialogs and toasts">
        <Dropdown label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} icon={<ArrowUpDown size={16} />} />
        <Button variant="secondary" onClick={() => setModalOpen(true)}>Open dialog</Button>
        <Button variant="secondary" onClick={() => toast.success("Meeting created", "Q3 Product Roadmap Review is ready.")}>Success toast</Button>
        <Button variant="secondary" onClick={() => toast.error("Couldn't save changes", "Check your connection and try again.")}>Error toast</Button>
        <Button variant="secondary" onClick={() => toast.info("Summary is generating")}>Info toast</Button>
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Delete this meeting?"
          description="This permanently deletes the meeting, its transcript, summary and action items."
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Keep meeting</Button>
              <Button variant="danger" onClick={() => { setModalOpen(false); toast.success("Meeting deleted"); }}>Delete meeting</Button>
            </>
          }
        />
      </Section>

      <Section title="Search highlight" note="Matches are marked inside transcript text.">
        <p className={styles.transcript}>
          <SearchHighlight
            text="Let's move the collaborative workspace to Q4 and focus the Q3 roadmap on AI search and mobile performance."
            query={query}
          />
        </p>
      </Section>

      <Section title="Loading and empty states">
        <div className={styles.stack}>
          <Skeleton height={16} width="70%" />
          <Skeleton height={12} />
          <Skeleton height={12} width="85%" />
        </div>
        <div className={styles.panel}>
          <EmptyState
            icon={<Video size={24} />}
            title="No meetings yet"
            description="Upload a transcript to create your first meeting."
            action={<Button leftIcon={<Plus size={16} />}>New meeting</Button>}
          />
        </div>
      </Section>
    </PageContainer>
  );
}
