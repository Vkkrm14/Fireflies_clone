"use client";

import useSWR from "swr";
import { api, type ApiError } from "../api";
import type { User } from "../types";

export function useUser() {
  return useSWR<User, ApiError>(["user", "me"], () => api.users.me(), { revalidateOnFocus: false });
}
