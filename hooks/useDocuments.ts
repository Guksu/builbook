"use client";

import useSWR from "swr";
import { fetcher, apiSend } from "./fetcher";
import type { DocumentNode, DocType } from "./types";

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

    async moveDocument(id: string, parentId: string | null, order: number) {
      await apiSend(`/api/documents/${id}/move`, "PATCH", { parentId, order });
      await mutate();
    },
  };
}
