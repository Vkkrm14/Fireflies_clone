"use client";

import useSWR from "swr";
import { api, type ApiError } from "../api";
import type { ActionItem, ActionItemInput, ActionItemPatch } from "../types";

export function useActionItems(meetingId: number) {
  const { data, error, isLoading, mutate } = useSWR<ActionItem[], ApiError>(["action-items", meetingId], () =>
    api.actionItems.list(meetingId),
  );

  const add = async (input: ActionItemInput) => {
    const created = await api.actionItems.create(meetingId, input);
    await mutate((current) => [...(current ?? []), created], { revalidate: false });
    return created;
  };

  const update = (itemId: number, patch: ActionItemPatch) =>
    mutate(
      async (current) => {
        const updated = await api.actionItems.update(meetingId, itemId, patch);
        return (current ?? []).map((item) => (item.id === itemId ? updated : item));
      },
      {
        optimisticData: (current) => (current ?? []).map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      },
    );

  const remove = (itemId: number) =>
    mutate(
      async (current) => {
        await api.actionItems.remove(meetingId, itemId);
        return (current ?? []).filter((item) => item.id !== itemId);
      },
      {
        optimisticData: (current) => (current ?? []).filter((item) => item.id !== itemId),
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      },
    );

  return { items: data, error, isLoading, add, update, remove };
}
