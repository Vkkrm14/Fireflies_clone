/**
 * Route table mirroring app.fireflies.ai (read from its Next.js build manifest and sidebar links).
 * Meetings live under /notebook/[id]: a channel id shows the list, any other id shows one meeting.
 */
export interface Channel {
  id: string;
  label: string;
}

export const CHANNELS: Channel[] = [
  { id: "mine-shared", label: "My Meetings" },
  { id: "all", label: "All Meetings" },
  { id: "autopilot", label: "Voice Agent Meetings" },
  { id: "uploads", label: "Uploads" },
];

export const DEFAULT_CHANNEL = "mine-shared";

export const ROUTES = {
  home: "/",
  askFred: "/ask-fred",
  meetings: `/notebook/${DEFAULT_CHANNEL}`,
  tasks: "/welcome/tasks",
  skills: "/skills",
  analytics: "/analytics",
  agents: "/agents",
  integrations: "/integrations",
  settings: "/settings/meeting-recording",
  team: "/team",
  upgrade: "/upgrade",
} as const;

export function isChannelId(id: string): boolean {
  return CHANNELS.some((c) => c.id === id);
}

export function channelLabel(id: string): string {
  return CHANNELS.find((c) => c.id === id)?.label ?? "My Meetings";
}

export function notebookHref(id: number | string): string {
  return `/notebook/${id}`;
}

/** Fireflies share links look like /view/Title-Slug::id */
export function viewHref(meeting: { id: number; title: string }): string {
  const slug = meeting.title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `/view/${encodeURIComponent(slug || "meeting")}::${meeting.id}`;
}

/** Accepts "12", "Some-Title::12" or the URL-encoded form of either. Returns null when there is no id. */
export function parseMeetingId(param: string): number | null {
  let value = param;
  try {
    value = decodeURIComponent(param);
  } catch {
    // keep the raw value
  }
  const tail = value.includes("::") ? value.split("::").pop() ?? "" : value;
  return /^\d+$/.test(tail) ? Number(tail) : null;
}

export interface SettingsSection {
  slug: string;
  label: string;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { slug: "language-appearance", label: "Language & Appearance" },
  { slug: "meeting-recording", label: "Recording & Privacy" },
  { slug: "compliance", label: "Compliance Notification" },
  { slug: "email-assistant", label: "Email Assistant" },
  { slug: "ai-settings", label: "AI Settings" },
  { slug: "live-assist", label: "Live Assist" },
  { slug: "knowledge-base", label: "Knowledge Base" },
  { slug: "mcp-api", label: "MCP & API" },
  { slug: "cookies", label: "Cookies" },
  { slug: "account", label: "Account" },
];

/** Where a pathname sits in the app chrome. */
export type Chrome = "shell" | "notebook" | "settings";

export function chromeForPath(pathname: string): Chrome {
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/view/")) return "notebook";
  const m = /^\/notebook\/([^/]+)/.exec(pathname);
  if (m && !isChannelId(m[1])) return "notebook";
  return "shell";
}

export function titleForPath(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/notebook")) return "Meetings";
  if (pathname.startsWith("/ask-fred")) return "AskFred";
  if (pathname.startsWith("/welcome/tasks")) return "Tasks";
  if (pathname.startsWith("/skills")) return "AI Skills";
  if (pathname.startsWith("/analytics") || pathname.startsWith("/statistics")) return "Analytics";
  if (pathname.startsWith("/agents")) return "Voice Agents";
  if (pathname.startsWith("/integrations")) return "Integrations";
  if (pathname.startsWith("/team")) return "Team";
  if (pathname.startsWith("/upgrade")) return "Upgrade";
  if (pathname.startsWith("/search")) return "Search";
  if (pathname.startsWith("/design-system")) return "Design system";
  return "Fireflies";
}
