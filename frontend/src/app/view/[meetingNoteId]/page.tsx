"use client";

import { useParams } from "next/navigation";
import { MeetingNotebook } from "@/components/notebook/MeetingNotebook";
import { parseMeetingId } from "@/lib/routes";

/** Shareable meeting link, e.g. /view/Q3-Roadmap-Review::1 */
export default function ViewPage() {
  const { meetingNoteId } = useParams<{ meetingNoteId: string }>();
  return <MeetingNotebook meetingId={parseMeetingId(meetingNoteId)} />;
}
