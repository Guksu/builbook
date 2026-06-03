"use client";

import useSWR from "swr";
import {
  STORES,
  dbGetAllByProject,
  dbGet,
  dbPut,
  dbBulkPut,
  dbBulkDelete,
} from "@shared/db";
import type { DocumentNode, DocType } from "../model/types";

// 문서 목록 SWR 키 — 자동저장 등 외부에서 캐시 무효화할 때 동일 키 사용.
export const documentsKey = (projectId: string) => `documents:${projectId}`;

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
const now = () => new Date().toISOString();

function listDocuments(projectId: string) {
  return dbGetAllByProject<DocumentNode>(STORES.documents, projectId);
}

// 자동저장(feature)에서 호출하는 독립 함수 — content/wordCount만 갱신.
export async function saveDocumentContent(
  id: string,
  content: unknown,
  wordCount: number,
) {
  const doc = await dbGet<DocumentNode>(STORES.documents, id);
  if (!doc) return;
  await dbPut(STORES.documents, { ...doc, content, wordCount, updatedAt: now() });
}

export function useDocuments(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<DocumentNode[]>(
    projectId ? documentsKey(projectId) : null,
    () => listDocuments(projectId),
  );

  const documents = data ?? [];

  // 한 노드의 모든 자손 id(자신 포함) 수집 — cascade 삭제용.
  function collectSubtree(rootId: string): string[] {
    const ids = [rootId];
    const stack = [rootId];
    while (stack.length) {
      const parent = stack.pop()!;
      for (const d of documents) {
        if (d.parentId === parent) {
          ids.push(d.id);
          stack.push(d.id);
        }
      }
    }
    return ids;
  }

  return {
    documents,
    isLoading,
    error,
    mutate,

    async createDocument(input: {
      title: string;
      type?: DocType;
      parentId?: string | null;
    }) {
      const type = input.type ?? "DOC";
      const ts = now();
      const doc: DocumentNode = {
        id: crypto.randomUUID(),
        projectId,
        parentId: input.parentId ?? null,
        type,
        title: input.title,
        order: documents.filter((d) => d.parentId === (input.parentId ?? null)).length,
        content: type === "DOC" ? EMPTY_DOC : null,
        synopsis: null,
        wordCount: 0,
        createdAt: ts,
        updatedAt: ts,
      };
      await dbPut(STORES.documents, doc);
      await mutate();
      return doc;
    },

    async renameDocument(id: string, title: string) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, { ...doc, title, updatedAt: now() });
      await mutate();
    },

    async updateSynopsis(id: string, synopsis: string) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, { ...doc, synopsis, updatedAt: now() });
      await mutate();
    },

    async deleteDocument(id: string) {
      // 하위 노드까지 함께 삭제(Postgres onDelete:Cascade를 클라이언트에서 재현).
      await dbBulkDelete(STORES.documents, collectSubtree(id));
      await mutate();
    },

    async moveDocument(id: string, parentId: string | null, order: number) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, { ...doc, parentId, order, updatedAt: now() });
      await mutate();
    },

    // 형제 그룹을 orderedIds 순서로 parentId 통일 + 0..n-1 재인덱싱(드래그 재정렬).
    async reorderSiblings(parentId: string | null, orderedIds: string[]) {
      const ts = now();
      const updated: DocumentNode[] = [];
      for (let i = 0; i < orderedIds.length; i++) {
        const doc = await dbGet<DocumentNode>(STORES.documents, orderedIds[i]);
        if (doc) updated.push({ ...doc, parentId, order: i, updatedAt: ts });
      }
      await dbBulkPut(STORES.documents, updated);
      await mutate();
    },
  };
}
