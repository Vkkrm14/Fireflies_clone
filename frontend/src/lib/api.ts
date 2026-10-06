import type {
  AskResponse, Comment, Soundbite, TagCount,
  ActionItem, ActionItemInput, ActionItemPatch, GlobalSearchResponse, MeetingDetail,
  MeetingListParams, MeetingsListResponse, MeetingUpdateInput, Summary,
  TranscriptSearchResult, TranscriptSegment, User,
} from "./types";

export const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail: unknown = null) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params?: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit | null;
}

/** FastAPI sends `detail` as a string, or as a list of {loc, msg} for validation errors. */
export function describeDetail(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("detail" in body)) return null;
  const { detail } = body as { detail: unknown };
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) => (typeof d === "object" && d !== null && "msg" in d ? String((d as { msg: unknown }).msg) : null))
      .filter((m): m is string => Boolean(m))
      .map((m) => m.replace(/^Value error, /, ""));
    return messages.length ? messages.join("; ") : null;
  }
  return null;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { json, headers, body, ...rest } = options;
  const finalHeaders = new Headers(headers);
  let finalBody = body;
  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    finalBody = JSON.stringify(json);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders, body: finalBody });
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      // body was not JSON
    }
    const message = describeDetail(detail) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const meetingPath = (id: number) => `/api/meetings/${id}`;

export type ExportKind = "transcript" | "summary";
export type ExportFormat = "txt" | "md" | "json";

/** URL of the backend export endpoint; the browser downloads it via Content-Disposition. */
export const exportUrl = (id: number, kind: ExportKind, format: ExportFormat) =>
  `${BASE_URL}${meetingPath(id)}/export?kind=${kind}&format=${format}`;

export const api = {
  users: {
    me: () => apiFetch<User>("/api/users/me"),
  },
  meetings: {
    list: (params?: MeetingListParams) =>
      apiFetch<MeetingsListResponse>(`/api/meetings${buildQuery({ ...params })}`),
    get: (id: number) => apiFetch<MeetingDetail>(meetingPath(id)),
    create: (form: FormData) => apiFetch<MeetingDetail>("/api/meetings", { method: "POST", body: form }),
    update: (id: number, input: MeetingUpdateInput) =>
      apiFetch<MeetingDetail>(meetingPath(id), { method: "PUT", json: input }),
    remove: (id: number) => apiFetch<void>(meetingPath(id), { method: "DELETE" }),
  },
  transcript: {
    list: (id: number) => apiFetch<TranscriptSegment[]>(`${meetingPath(id)}/transcript`),
    search: (id: number, q: string) =>
      apiFetch<TranscriptSearchResult[]>(`${meetingPath(id)}/transcript/search${buildQuery({ q })}`),
    upload: (id: number, form: FormData) =>
      apiFetch<TranscriptSegment[]>(`${meetingPath(id)}/transcript`, { method: "POST", body: form }),
  },
  summary: {
    get: (id: number) => apiFetch<Summary>(`${meetingPath(id)}/summary`),
    generate: (id: number) => apiFetch<Summary>(`${meetingPath(id)}/summary/generate`, { method: "POST" }),
  },
  actionItems: {
    list: (id: number) => apiFetch<ActionItem[]>(`${meetingPath(id)}/action-items`),
    create: (id: number, input: ActionItemInput) =>
      apiFetch<ActionItem>(`${meetingPath(id)}/action-items`, { method: "POST", json: input }),
    update: (id: number, itemId: number, patch: ActionItemPatch) =>
      apiFetch<ActionItem>(`${meetingPath(id)}/action-items/${itemId}`, { method: "PUT", json: patch }),
    remove: (id: number, itemId: number) =>
      apiFetch<void>(`${meetingPath(id)}/action-items/${itemId}`, { method: "DELETE" }),
  },
  tags: {
    list: () => apiFetch<TagCount[]>("/api/tags"),
    set: (id: number, tags: string[]) =>
      apiFetch<{ tags: string[] }>(`${meetingPath(id)}/tags`, { method: "PUT", json: { tags } }),
  },
  comments: {
    list: (id: number) => apiFetch<Comment[]>(`${meetingPath(id)}/comments`),
    create: (id: number, segment_id: number, text: string) =>
      apiFetch<Comment>(`${meetingPath(id)}/comments`, { method: "POST", json: { segment_id, text } }),
    remove: (id: number, commentId: number) =>
      apiFetch<void>(`${meetingPath(id)}/comments/${commentId}`, { method: "DELETE" }),
  },
  soundbites: {
    list: (id: number) => apiFetch<Soundbite[]>(`${meetingPath(id)}/soundbites`),
    create: (id: number, input: { title: string; start_time: number; end_time: number }) =>
      apiFetch<Soundbite>(`${meetingPath(id)}/soundbites`, { method: "POST", json: input }),
    remove: (id: number, soundbiteId: number) =>
      apiFetch<void>(`${meetingPath(id)}/soundbites/${soundbiteId}`, { method: "DELETE" }),
  },
  ask: (id: number, question: string) =>
    apiFetch<AskResponse>(`${meetingPath(id)}/ask`, { method: "POST", json: { question } }),
  search: {
    global: (q: string) => apiFetch<GlobalSearchResponse>(`/api/search${buildQuery({ q })}`),
  },
};
