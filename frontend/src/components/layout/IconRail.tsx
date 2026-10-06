"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot, ChartColumn, House, Layers, ListChecks, Settings, Sparkles, UserPlus, Video, Zap, type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { FireflyMark } from "./FireflyMark";
import styles from "./IconRail.module.css";

interface RailItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  hint?: string;
}

const startsWith = (prefix: string) => (p: string) => p.startsWith(prefix);

const TOP: RailItem[] = [
  { href: ROUTES.home, label: "Home", icon: House, match: (p) => p === "/" },
  { href: ROUTES.askFred, label: "AskFred", hint: "Ctrl + J", icon: Bot, match: startsWith("/ask-fred") },
];
const MAIN: RailItem[] = [
  { href: ROUTES.meetings, label: "Meetings", icon: Video, match: (p) => p.startsWith("/notebook") || p.startsWith("/view") },
  { href: ROUTES.tasks, label: "Tasks", icon: ListChecks, match: startsWith("/welcome/tasks") },
  { href: ROUTES.skills, label: "AI Skills", icon: Sparkles, match: startsWith("/skills") },
];
const INSIGHTS: RailItem[] = [
  { href: ROUTES.analytics, label: "Analytics", icon: ChartColumn, match: startsWith("/analytics") },
  { href: ROUTES.agents, label: "Voice Agents", icon: Bot, match: startsWith("/agents") },
];
const BOTTOM: RailItem[] = [
  { href: ROUTES.team, label: "Team", icon: UserPlus, match: startsWith("/team") },
  { href: ROUTES.integrations, label: "Integrations", icon: Layers, match: startsWith("/integrations") },
  { href: ROUTES.settings, label: "Settings", icon: Settings, match: startsWith("/settings") },
];

function RailLink({ item, pathname }: { item: RailItem; pathname: string }) {
  const Icon = item.icon;
  const active = item.match(pathname);
  return (
    <Link
      href={item.href}
      className={styles.item}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={item.hint ? `${item.label} (${item.hint})` : item.label}
    >
      <Icon size={18} aria-hidden />
    </Link>
  );
}

export function IconRail() {
  const pathname = usePathname();
  return (
    <aside className={styles.rail}>
      <Link href={ROUTES.home} className={styles.logo} aria-label="Fireflies home">
        <FireflyMark />
      </Link>
      <nav className={styles.nav} aria-label="Main">
        <div className={styles.group}>
          {TOP.map((item) => <RailLink key={item.href} item={item} pathname={pathname} />)}
        </div>
        <div className={styles.group}>
          {MAIN.map((item) => <RailLink key={item.href} item={item} pathname={pathname} />)}
        </div>
        <div className={styles.group}>
          {INSIGHTS.map((item) => <RailLink key={item.href} item={item} pathname={pathname} />)}
          <Link href={ROUTES.upgrade} className={styles.item} aria-label="What's new" title="What's new">
            <Zap size={18} aria-hidden />
            <span className={styles.dot} />
          </Link>
        </div>
      </nav>
      <div className={styles.bottom}>
        {BOTTOM.map((item) => <RailLink key={item.href} item={item} pathname={pathname} />)}
      </div>
    </aside>
  );
}
