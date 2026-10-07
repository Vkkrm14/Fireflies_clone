"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot, ChartColumn, House, Layers, ListChecks, PanelLeftClose, PanelLeftOpen, Settings, Sparkles, UserPlus, Video, Zap,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/lib/hooks/useSidebar";
import { ROUTES } from "@/lib/routes";
import { FireflyMark } from "./FireflyMark";
import styles from "./IconRail.module.css";

interface RailItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  hint?: string;
  badge?: boolean;
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
  { href: ROUTES.upgrade, label: "What's new", icon: Zap, match: startsWith("/upgrade"), badge: true },
];
const BOTTOM: RailItem[] = [
  { href: ROUTES.team, label: "Team", icon: UserPlus, match: startsWith("/team") },
  { href: ROUTES.integrations, label: "Integrations", icon: Layers, match: startsWith("/integrations") },
  { href: ROUTES.settings, label: "Settings", icon: Settings, match: startsWith("/settings") },
];

function RailLink({ item, pathname }: { item: RailItem; pathname: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={styles.item}
      aria-current={item.match(pathname) ? "page" : undefined}
      aria-label={item.label}
      title={item.hint ? `${item.label} (${item.hint})` : item.label}
    >
      <Icon size={18} aria-hidden />
      <span className={styles.label}>{item.label}</span>
      {item.badge ? <span className={styles.dot} /> : null}
    </Link>
  );
}

/**
 * Side navigation. Labels are always in the DOM; the `data-rail` attribute on <html> (set before first paint,
 * see lib/sidebar.ts) decides whether they show, so expanding never depends on React state at load time.
 */
export function IconRail() {
  const pathname = usePathname();
  const [expanded, toggle] = useSidebar();

  return (
    <div className={styles.slot}>
      <aside className={styles.rail} aria-label="Primary">
        <div className={styles.head}>
          <Link href={ROUTES.home} className={styles.logo} aria-label="Fireflies home">
            <FireflyMark />
            <span className={styles.brand}>Fireflies.ai</span>
          </Link>
          <button
            type="button"
            className={styles.toggle}
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? <PanelLeftClose size={17} aria-hidden /> : <PanelLeftOpen size={17} aria-hidden />}
          </button>
        </div>
        <nav className={styles.nav} aria-label="Main">
          <div className={styles.group}>
            {TOP.map((item) => <RailLink key={item.href} item={item} pathname={pathname} />)}
          </div>
          <div className={styles.group}>
            {MAIN.map((item) => <RailLink key={item.href} item={item} pathname={pathname} />)}
          </div>
          <div className={styles.group}>
            {INSIGHTS.map((item) => <RailLink key={item.href} item={item} pathname={pathname} />)}
          </div>
        </nav>
        <div className={styles.bottom}>
          {BOTTOM.map((item) => <RailLink key={item.href} item={item} pathname={pathname} />)}
        </div>
      </aside>
    </div>
  );
}
