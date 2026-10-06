"use client";

import useSWR from "swr";
import { api, type ApiError } from "../api";
import type { MeetingListParams, MeetingsListResponse } from "../types";

export function useMeetings(params: MeetingListParams = {}) {
  return useSWR<MeetingsListResponse, ApiError>(["meetings", params], () => api.meetings.list(params), {
    keepPreviousData: true,
  });
}
