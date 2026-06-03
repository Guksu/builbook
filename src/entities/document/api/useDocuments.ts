"use client";

import useSWR from "swr";
import { fetcher, apiSend } from "@shared/api";
import type { DocumentNode, DocType } from "../model/types";

// GET /api/projects/[id]/documents → { items: DocumentNode[] } (평면). .items unwrap.
export function useDocuments(projectId: string) {
  const key = projectId ? `/api/projects/${projectId}/documents` : null;
  const { data, error, isLoading, mutate } = useSWR<{ items: DocumentNode[] }>(
    key,
    fetcher,
  );

  const documents = data?.items ?? [];

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
      const created = (await apiSend(
        `/api/projects/${projectId}/documents`,
        "POST",
        input,
      )) as DocumentNode;
      await mutate();
      return created;
    },

    async renameDocument(id: string, title: string) {
      await apiSend(`/api/documents/${id}`, "PATCH", { title });
      await mutate();
    },

    async deleteDocument(id: string) {
      await apiSend(`/api/documents/${id}`, "DELETE");
      await mutate();
    },

    async updateSynopsis(id: string, synopsis: string) {
      await apiSend(`/api/documents/${id}`, "PATCH", { synopsis });
      await mutate();
    },

    async moveDocument(id: string, parentId: string | null, order: number) {
      await apiSend(`/api/documents/${id}/move`, "PATCH", { parentId, order });
      await mutate();
    },

    // 형제 그룹을 orderedIds 순서로 0..n-1 정수 재인덱싱(드래그 재정렬용).
    // content는 건드리지 않고 parentId/order만 갱신. 모두 적용 후 한 번만 refetch.
    async reorderSiblings(parentId: string | null, orderedIds: string[]) {
      await Promise.all(
        orderedIds.map((docId, i) =>
          apiSend(`/api/documents/${docId}/move`, "PATCH", { parentId, order: i }),
        ),
      );
      await mutate();
    },
  };
}
