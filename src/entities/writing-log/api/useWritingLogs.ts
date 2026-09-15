"use client";

import useSWR from "swr";
import { STORES, dbGet, dbGetAllByProject, dbPut, dbBulkDelete } from "@shared/db";
import type { WritingLog } from "../model/types";
import { applyDelta, dateKey, logId, type WritingDelta } from "../lib/stats";

export const writingLogsKey = (projectId: string) => `writingLogs:${projectId}`;

/**
 * 저장 시 발생한 단어 수 변화를 오늘 기록에 더한다.
 * 자동저장 경로에서 호출되므로 실패해도 원고 저장을 방해하지 않는다(호출부에서 catch).
 */
export async function recordWriting(projectId: string, delta: WritingDelta): Promise<void> {
  if (!projectId || (!delta.words && !delta.chars)) return; // 변화 없는 저장은 기록하지 않는다
  const date = dateKey(new Date());
  const id = logId(projectId, date);
  const existing = await dbGet<WritingLog>(STORES.writingLogs, id);
  const next = applyDelta(existing, {
    projectId,
    date,
    delta,
    now: new Date().toISOString(),
  });
  await dbPut(STORES.writingLogs, next);
}

/** 작품 삭제 cascade — 고아 기록이 남지 않게 한다. */
export async function deleteWritingLogsForProject(projectId: string): Promise<void> {
  const logs = await dbGetAllByProject<WritingLog>(STORES.writingLogs, projectId);
  if (!logs.length) return;
  await dbBulkDelete(
    STORES.writingLogs,
    logs.map((l) => l.id),
  );
}

export function useWritingLogs(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<WritingLog[]>(
    projectId ? writingLogsKey(projectId) : null,
    () => dbGetAllByProject<WritingLog>(STORES.writingLogs, projectId),
  );

  return {
    logs: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
