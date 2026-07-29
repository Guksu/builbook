"use client";

import useSWR from "swr";
import {
  STORES,
  dbBulkDelete,
  dbBulkPut,
  dbDelete,
  dbGet,
  dbGetAllByProject,
  dbPut,
} from "@shared/db";
import type { StoryEvent } from "../model/types";
import { isValidEventTitle, moveEvent, sortEvents } from "../lib/timeline";

export const storyEventsKey = (projectId: string) => `storyEvents:${projectId}`;

const now = () => new Date().toISOString();

export interface CreateEventInput {
  title: string;
  when?: string;
  body?: string;
  documentId?: string | null;
}

export interface UpdateEventInput {
  title?: string;
  when?: string;
  body?: string;
  documentId?: string | null;
}

/** 작품 삭제 cascade — 고아 사건이 남지 않게 한다. */
export async function deleteStoryEventsForProject(projectId: string): Promise<void> {
  const events = await dbGetAllByProject<StoryEvent>(STORES.events, projectId);
  if (!events.length) return;
  await dbBulkDelete(
    STORES.events,
    events.map((e) => e.id),
  );
}

export function useStoryEvents(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<StoryEvent[]>(
    projectId ? storyEventsKey(projectId) : null,
    () => dbGetAllByProject<StoryEvent>(STORES.events, projectId),
  );

  const events = sortEvents(data ?? []);

  return {
    events,
    isLoading,
    error,
    mutate,

    async createEvent(input: CreateEventInput) {
      if (!isValidEventTitle(input.title)) return null;
      // order는 IndexedDB의 현재 최대값 기준으로 계산한다(SWR 스냅샷은 stale일 수 있다).
      const current = await dbGetAllByProject<StoryEvent>(STORES.events, projectId);
      const order = current.reduce((max, e) => Math.max(max, e.order + 1), 0);
      const ts = now();
      const event: StoryEvent = {
        id: crypto.randomUUID(),
        projectId,
        title: input.title.trim(),
        when: input.when?.trim() ?? "",
        body: input.body?.trim() ?? "",
        documentId: input.documentId ?? null,
        order,
        createdAt: ts,
        updatedAt: ts,
      };
      await dbPut(STORES.events, event);
      await mutate();
      return event;
    },

    async updateEvent(id: string, input: UpdateEventInput) {
      const event = await dbGet<StoryEvent>(STORES.events, id);
      if (!event) return;
      if (input.title !== undefined && !isValidEventTitle(input.title)) return;
      await dbPut(STORES.events, {
        ...event,
        title: input.title?.trim() ?? event.title,
        when: input.when?.trim() ?? event.when,
        body: input.body?.trim() ?? event.body,
        documentId:
          input.documentId === undefined ? event.documentId : input.documentId,
        updatedAt: now(),
      });
      await mutate();
    },

    async deleteEvent(id: string) {
      await dbDelete(STORES.events, id);
      await mutate();
    },

    /** 한 칸 위/아래로 이동 — 전체 order를 0..n-1로 다시 매겨 촘촘하게 유지한다. */
    async moveEventBy(id: string, direction: "up" | "down") {
      const orderedIds = moveEvent(events, id, direction);
      const byId = new Map(events.map((e) => [e.id, e] as const));
      const ts = now();
      const updated = orderedIds
        .map((eid, index) => {
          const event = byId.get(eid);
          return event ? { ...event, order: index, updatedAt: ts } : null;
        })
        .filter((e): e is StoryEvent => e !== null);
      await dbBulkPut(STORES.events, updated);
      await mutate();
    },
  };
}
