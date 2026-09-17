"use client";

import useSWR from "swr";
import { STORES, dbBulkDelete, dbDelete, dbGet, dbGetAllByProject, dbPut } from "@shared/db";
import type { Relation } from "../model/types";
import { isValidRelationType } from "../lib/relations";

export const relationsKey = (projectId: string) => `relations:${projectId}`;
const now = () => new Date().toISOString();

export interface RelationInput {
  type: string;
  fromLabel?: string;
  toLabel?: string;
  note?: string;
}

/** 작품 삭제 cascade. */
export async function deleteRelationsForProject(projectId: string): Promise<void> {
  const items = await dbGetAllByProject<Relation>(STORES.relations, projectId);
  if (!items.length) return;
  await dbBulkDelete(
    STORES.relations,
    items.map((r) => r.id),
  );
}

/** 인물 카드 영구 삭제 cascade — 그 인물이 얽힌 선을 지운다. */
export async function deleteRelationsForDocuments(projectId: string, docIds: readonly string[]): Promise<void> {
  const ids = new Set(docIds);
  const items = await dbGetAllByProject<Relation>(STORES.relations, projectId);
  const targets = items.filter((r) => ids.has(r.fromId) || ids.has(r.toId));
  if (!targets.length) return;
  await dbBulkDelete(
    STORES.relations,
    targets.map((r) => r.id),
  );
}

export function useRelations(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<Relation[]>(
    projectId ? relationsKey(projectId) : null,
    () => dbGetAllByProject<Relation>(STORES.relations, projectId),
  );

  return {
    relations: data ?? [],
    isLoading,
    error,
    mutate,

    async createRelation(fromId: string, toId: string, input: RelationInput): Promise<Relation | null> {
      if (fromId === toId || !isValidRelationType(input.type)) return null;
      const ts = now();
      const relation: Relation = {
        id: crypto.randomUUID(),
        projectId,
        fromId,
        toId,
        type: input.type.trim(),
        fromLabel: input.fromLabel?.trim() ?? "",
        toLabel: input.toLabel?.trim() ?? "",
        note: input.note?.trim() ?? "",
        createdAt: ts,
        updatedAt: ts,
      };
      await dbPut(STORES.relations, relation);
      await mutate();
      return relation;
    },

    async updateRelation(id: string, input: RelationInput) {
      if (!isValidRelationType(input.type)) return;
      const r = await dbGet<Relation>(STORES.relations, id);
      if (!r) return;
      await dbPut(STORES.relations, {
        ...r,
        type: input.type.trim(),
        fromLabel: input.fromLabel?.trim() ?? r.fromLabel,
        toLabel: input.toLabel?.trim() ?? r.toLabel,
        note: input.note?.trim() ?? r.note,
        updatedAt: now(),
      });
      await mutate();
    },

    async deleteRelation(id: string) {
      await dbDelete(STORES.relations, id);
      await mutate();
    },
  };
}
