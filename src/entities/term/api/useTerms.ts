"use client";

import useSWR from "swr";
import { STORES, dbBulkDelete, dbDelete, dbGet, dbGetAllByProject, dbPut } from "@shared/db";
import type { Term, TermCategory } from "../model/types";
import { isValidTermName, sortTerms } from "../lib/terms";

export const termsKey = (projectId: string) => `terms:${projectId}`;

const now = () => new Date().toISOString();

export interface CreateTermInput {
  name: string;
  category?: TermCategory;
  aliases?: string[];
  note?: string;
}

export interface UpdateTermInput {
  name?: string;
  category?: TermCategory;
  aliases?: string[];
  note?: string;
}

/** 작품 삭제 cascade — 고아 용어가 남지 않게 한다. */
export async function deleteTermsForProject(projectId: string): Promise<void> {
  const terms = await dbGetAllByProject<Term>(STORES.terms, projectId);
  if (!terms.length) return;
  await dbBulkDelete(
    STORES.terms,
    terms.map((t) => t.id),
  );
}

export function useTerms(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<Term[]>(
    projectId ? termsKey(projectId) : null,
    () => dbGetAllByProject<Term>(STORES.terms, projectId),
  );

  return {
    terms: sortTerms(data ?? []),
    isLoading,
    error,
    mutate,

    async createTerm(input: CreateTermInput) {
      if (!isValidTermName(input.name)) return null;
      const ts = now();
      const term: Term = {
        id: crypto.randomUUID(),
        projectId,
        category: input.category ?? "PERSON",
        name: input.name.trim(),
        aliases: input.aliases ?? [],
        note: input.note?.trim() ?? "",
        createdAt: ts,
        updatedAt: ts,
      };
      await dbPut(STORES.terms, term);
      await mutate();
      return term;
    },

    async updateTerm(id: string, input: UpdateTermInput) {
      const term = await dbGet<Term>(STORES.terms, id);
      if (!term) return;
      if (input.name !== undefined && !isValidTermName(input.name)) return;
      await dbPut(STORES.terms, {
        ...term,
        name: input.name?.trim() ?? term.name,
        category: input.category ?? term.category,
        aliases: input.aliases ?? term.aliases,
        note: input.note?.trim() ?? term.note,
        updatedAt: now(),
      });
      await mutate();
    },

    async deleteTerm(id: string) {
      await dbDelete(STORES.terms, id);
      await mutate();
    },
  };
}
