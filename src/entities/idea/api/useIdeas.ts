"use client";

import useSWR from "swr";
import { STORES, dbBulkDelete, dbDelete, dbGet, dbGetAllByProject, dbPut } from "@shared/db";
import type { Idea, IdeaKind } from "../model/types";
import { isValidIdeaText, sortIdeas } from "../lib/ideas";

export const ideasKey = (projectId: string) => `ideas:${projectId}`;

const now = () => new Date().toISOString();

export interface CreateIdeaInput {
  kind: IdeaKind;
  text: string;
  source?: string;
  linkedDocumentId?: string | null;
}

/** 작품 삭제 cascade — 고아 메모가 남지 않게 한다. */
export async function deleteIdeasForProject(projectId: string): Promise<void> {
  const ideas = await dbGetAllByProject<Idea>(STORES.ideas, projectId);
  if (!ideas.length) return;
  await dbBulkDelete(
    STORES.ideas,
    ideas.map((i) => i.id),
  );
}

export function useIdeas(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<Idea[]>(
    projectId ? ideasKey(projectId) : null,
    () => dbGetAllByProject<Idea>(STORES.ideas, projectId),
  );

  return {
    ideas: sortIdeas(data ?? []),
    isLoading,
    error,
    mutate,

    async createIdea(input: CreateIdeaInput): Promise<Idea | null> {
      if (!isValidIdeaText(input.text)) return null;
      const ts = now();
      const idea: Idea = {
        id: crypto.randomUUID(),
        projectId,
        kind: input.kind,
        text: input.text.trim(),
        ...(input.source ? { source: input.source } : {}),
        ...(input.linkedDocumentId ? { linkedDocumentId: input.linkedDocumentId } : {}),
        createdAt: ts,
        updatedAt: ts,
      };
      await dbPut(STORES.ideas, idea);
      await mutate();
      return idea;
    },

    async updateIdeaText(id: string, text: string) {
      if (!isValidIdeaText(text)) return;
      const idea = await dbGet<Idea>(STORES.ideas, id);
      if (!idea) return;
      await dbPut(STORES.ideas, { ...idea, text: text.trim(), updatedAt: now() });
      await mutate();
    },

    // 회차 연결 바꾸기(null이면 해제).
    async linkIdea(id: string, documentId: string | null) {
      const idea = await dbGet<Idea>(STORES.ideas, id);
      if (!idea) return;
      const next: Idea = { ...idea, updatedAt: now() };
      if (documentId) next.linkedDocumentId = documentId;
      else delete next.linkedDocumentId;
      await dbPut(STORES.ideas, next);
      await mutate();
    },

    async deleteIdea(id: string) {
      await dbDelete(STORES.ideas, id);
      await mutate();
    },
  };
}
