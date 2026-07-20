"use client";

import useSWR from "swr";
import {
  STORES,
  dbGet,
  dbPut,
  dbDelete,
  dbBulkDelete,
  dbGetAllByIndex,
} from "@shared/db";
import type { Snapshot } from "../model/types";

// 스냅샷 목록 SWR 키 — 문서 단위. 복원 등 외부에서 무효화할 때 동일 키 사용.
export const snapshotsKey = (documentId: string) => `snapshots:${documentId}`;

const now = () => new Date().toISOString();

function listByDocument(documentId: string) {
  return dbGetAllByIndex<Snapshot>(STORES.snapshots, "by-document", documentId);
}

// 복원 등에서 단건을 신선하게 다시 읽을 때 사용(목록 캐시 stale 방지).
export async function getSnapshot(id: string) {
  return dbGet<Snapshot>(STORES.snapshots, id);
}

// 문서(들)가 삭제될 때 딸린 스냅샷을 함께 지운다 — IndexedDB엔 Cascade가 없으므로 수동.
// 문서/작품 삭제 경로(useDocuments.deleteDocument, useProjects.deleteProject)에서 호출한다.
// 호출 안 하면 고아 스냅샷이 snapshots 스토어에 영구 누적된다.
export async function deleteSnapshotsForDocuments(
  documentIds: string[],
): Promise<void> {
  const lists = await Promise.all(
    documentIds.map((docId) =>
      dbGetAllByIndex<Snapshot>(STORES.snapshots, "by-document", docId),
    ),
  );
  const snapshotIds = lists.flat().map((s) => s.id);
  if (snapshotIds.length) {
    await dbBulkDelete(STORES.snapshots, snapshotIds);
  }
}

export interface CreateSnapshotInput {
  documentId: string;
  projectId: string;
  title: string;
  content: unknown | null;
  wordCount: number;
  note?: string | null;
}

// 훅 밖(정리 스크립트 등)에서도 호출 가능한 독립 생성 함수.
export async function createSnapshotRecord(
  input: CreateSnapshotInput,
): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    documentId: input.documentId,
    projectId: input.projectId,
    title: input.title,
    content: input.content,
    wordCount: input.wordCount,
    note: input.note?.trim() ? input.note.trim() : null,
    createdAt: now(),
  };
  await dbPut(STORES.snapshots, snapshot);
  return snapshot;
}

export function useSnapshots(documentId: string) {
  const { data, error, isLoading, mutate } = useSWR<Snapshot[]>(
    documentId ? snapshotsKey(documentId) : null,
    () => listByDocument(documentId),
  );

  // 최신순(내림차순) 정렬 — createdAt ISO 문자열 사전순 == 시간순.
  const snapshots = (data ?? [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    snapshots,
    isLoading,
    error,
    mutate,

    async createSnapshot(input: CreateSnapshotInput) {
      const snapshot = await createSnapshotRecord(input);
      await mutate();
      return snapshot;
    },

    async deleteSnapshot(id: string) {
      await dbDelete(STORES.snapshots, id);
      await mutate();
    },
  };
}
