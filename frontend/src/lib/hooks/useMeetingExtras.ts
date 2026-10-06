"use client";

import useSWR from "swr";
import { api, type ApiError } from "../api";
import type { Comment, Soundbite, TagCount } from "../types";

export function useTags() {
  return useSWR<TagCount[], ApiError>(["tags"], () => api.tags.list());
}

export function useComments(meetingId: number) {
  const { data, mutate } = useSWR<Comment[], ApiError>(["comments", meetingId], () => api.comments.list(meetingId));

  const add = async (segmentId: number, text: string) => {
    const created = await api.comments.create(meetingId, segmentId, text);
    await mutate((current) => [...(current ?? []), created], { revalidate: false });
  };

  const remove = (commentId: number) =>
    mutate(
      async (current) => {
        await api.comments.remove(meetingId, commentId);
        return (current ?? []).filter((c) => c.id !== commentId);
      },
      {
        optimisticData: (current) => (current ?? []).filter((c) => c.id !== commentId),
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      },
    );

  return { comments: data ?? [], add, remove };
}

export function useSoundbites(meetingId: number) {
  const { data, mutate } = useSWR<Soundbite[], ApiError>(["soundbites", meetingId], () => api.soundbites.list(meetingId));

  const add = async (input: { title: string; start_time: number; end_time: number }) => {
    const created = await api.soundbites.create(meetingId, input);
    await mutate((current) => [...(current ?? []), created].sort((a, b) => a.start_time - b.start_time), { revalidate: false });
  };

  const remove = (soundbiteId: number) =>
    mutate(
      async (current) => {
        await api.soundbites.remove(meetingId, soundbiteId);
        return (current ?? []).filter((s) => s.id !== soundbiteId);
      },
      {
        optimisticData: (current) => (current ?? []).filter((s) => s.id !== soundbiteId),
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      },
    );

  return { soundbites: data ?? [], add, remove };
}
