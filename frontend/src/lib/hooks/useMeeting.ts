"use client";

import useSWR from "swr";
import { api, type ApiError } from "../api";
import type { MeetingDetail } from "../types";

export function useMeeting(id: number | null) {
  return useSWR<MeetingDetail, ApiError>(id === null ? null : ["meeting", id], () => api.meetings.get(id as number));
}
