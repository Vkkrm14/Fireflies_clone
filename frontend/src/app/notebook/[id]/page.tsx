"use client";

import { useParams } from "next/navigation";
import { MeetingsView } from "@/components/meetings/MeetingsView";
import { MeetingNotebook } from "@/components/notebook/MeetingNotebook";
import { isChannelId, parseMeetingId } from "@/lib/routes";

/** Same dual role as app.fireflies.ai/notebook/[id]: a channel id lists meetings, anything else opens one. */
export default function NotebookPage() {
  const { id } = useParams<{ id: string }>();
  if (isChannelId(id)) return <MeetingsView channelId={id} />;
  return <MeetingNotebook meetingId={parseMeetingId(id)} />;
}
