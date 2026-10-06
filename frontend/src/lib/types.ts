export type MeetingSort = "newest" | "oldest" | "longest" | "shortest";

export interface Participant {
  id: number;
  meeting_id: number;
  user_id: number | null;
  name: string;
  role: string;
  avatar_color: string | null;
}

export interface TranscriptSegment {
  id: number;
  meeting_id: number;
  speaker_name: string;
  speaker_color: string | null;
  start_time: number;
  end_time: number;
  text: string;
  segment_index: number;
}

export interface TranscriptSearchResult {
  segment: TranscriptSegment;
  match_positions: number[];
}

export interface Chapter {
  title: string;
  start_time: number;
}

export interface Summary {
  id: number;
  meeting_id: number;
  overview: string;
  key_topics: string[] | null;
  chapters: Chapter[] | null;
  generated_at: string;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  text: string;
  assignee: string | null;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
}

export interface ActionItemInput {
  text: string;
  assignee?: string | null;
  is_completed?: boolean;
  due_date?: string | null;
}

export type ActionItemPatch = Partial<ActionItemInput>;

interface MeetingBase {
  id: number;
  title: string;
  date: string;
  duration: number;
  status: string;
  media_url: string | null;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  tags: string[];
}

export interface MeetingListItem extends MeetingBase {
  summary_snippet: string | null;
  action_items_count: number;
  completed_action_items_count: number;
}

export interface MeetingDetail extends MeetingBase {
  transcript_segments: TranscriptSegment[];
  summary: Summary | null;
  action_items: ActionItem[];
}

export interface MeetingsListResponse {
  meetings: MeetingListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface MeetingListParams {
  search?: string;
  sort?: MeetingSort;
  participant?: string;
  tag?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface MeetingUpdateInput {
  title?: string;
  date?: string;
  duration?: number;
  status?: string;
  media_url?: string | null;
  participants?: string[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface GlobalSearchResult {
  type: "meeting" | "summary" | "transcript";
  meeting_id: number;
  meeting_title: string;
  date: string | null;
  snippet: string;
  start_time?: number;
  speaker_name?: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  total: number;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface Comment {
  id: number;
  meeting_id: number;
  segment_id: number;
  author: string;
  text: string;
  created_at: string;
}

export interface Soundbite {
  id: number;
  meeting_id: number;
  title: string;
  start_time: number;
  end_time: number;
  created_at: string;
}

export interface AskSource {
  segment_id: number;
  speaker_name: string;
  start_time: number;
  text: string;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
}
