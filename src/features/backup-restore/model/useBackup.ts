"use client";

import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { DB_VERSION, STORES, dbGetAll, dbReplaceAll } from "@shared/db";
import type { Project } from "@entities/project";
import type { DocumentNode } from "@entities/document";
import type { Snapshot } from "@entities/snapshot";
import type { Note } from "@entities/note";
import type { WritingLog } from "@entities/writing-log";
import type { StoryEvent } from "@entities/story-event";
import type { Term } from "@entities/term";
import type { Idea } from "@entities/idea";
import type { Relation } from "@entities/relation";
import {
  backupFileName,
  backupStatus,
  buildBackup,
  countBackupData,
  parseBackup,
  planImport,
  serializeBackup,
  type BackupData,
  type BackupFile,
  type BackupStatus,
  type ImportMode,
  type ImportSummary,
} from "../lib/backup";
import { downloadJsonFile } from "../lib/backupFile";

// 마지막 백업 시각 — 데이터가 아니라 '이 브라우저의 습관' 정보라 localStorage에 둔다
// (IndexedDB에 두면 백업 파일에 섞여 들어가 복원할 때마다 시각이 되감긴다).
const LAST_BACKUP_KEY = "builbook:lastBackupAt";
// 배너와 모달이 각각 useBackup을 부르므로, 이 값은 SWR 캐시로 공유한다.
// (인스턴스별 useState로 두면 모달에서 백업해도 배너가 옛 상태로 남는다.)
const LAST_BACKUP_SWR_KEY = "backup:lastBackupAt";

function readLastBackupAt(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(LAST_BACKUP_KEY) ?? "";
}

// IndexedDB 전 스토어를 한 벌로 읽는다 — 백업의 원천.
export async function readAllData(): Promise<BackupData> {
  const [projects, documents, snapshots, notes, writingLogs, events, terms, ideas, relations] = await Promise.all([
    dbGetAll<Project>(STORES.projects),
    dbGetAll<DocumentNode>(STORES.documents),
    dbGetAll<Snapshot>(STORES.snapshots),
    dbGetAll<Note>(STORES.notes),
    dbGetAll<WritingLog>(STORES.writingLogs),
    dbGetAll<StoryEvent>(STORES.events),
    dbGetAll<Term>(STORES.terms),
    dbGetAll<Idea>(STORES.ideas),
    dbGetAll<Relation>(STORES.relations),
  ]);
  return { projects, documents, snapshots, notes, writingLogs, events, terms, ideas, relations };
}

export type ImportResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string };

export function useBackup(projectCount: number) {
  // SWR 전역 mutate — 복원 후 열려 있는 모든 화면(작품 목록·문서 트리·노트…)을 되살린다.
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState(false);
  // localStorage는 서버 렌더에 없다 — SWR 페처는 마운트 후에만 돌아 hydration 불일치가 없다.
  const { data: lastBackup, mutate: mutateLastBackup } = useSWR(
    LAST_BACKUP_SWR_KEY,
    readLastBackupAt,
    { revalidateOnFocus: false },
  );
  const lastBackupAt = lastBackup ? lastBackup : null;
  // 아직 안 읽었으면(undefined) null — 배너가 깜빡 나타났다 사라지지 않는다.
  const status: BackupStatus | null =
    lastBackup === undefined
      ? null
      : backupStatus(lastBackupAt, new Date(), projectCount);

  const exportBackup = useCallback(async () => {
    setBusy(true);
    try {
      const data = await readAllData();
      const exportedAt = new Date().toISOString();
      const file = buildBackup(data, { exportedAt, dbVersion: DB_VERSION });
      downloadJsonFile(backupFileName(exportedAt), serializeBackup(file));
      localStorage.setItem(LAST_BACKUP_KEY, exportedAt);
      // 같은 SWR 키를 쓰는 배너도 함께 갱신된다.
      await mutateLastBackup(exportedAt, { revalidate: false });
      return { ok: true as const, counts: file.counts };
    } finally {
      setBusy(false);
    }
  }, [mutateLastBackup]);

  // 파일 텍스트 → 검증만(쓰기 없음). 복원 전 미리보기 화면이 쓴다.
  const inspect = useCallback((text: string) => parseBackup(text), []);

  const importBackup = useCallback(
    async (file: BackupFile, mode: ImportMode): Promise<ImportResult> => {
      setBusy(true);
      try {
        const existing = await readAllData();
        const plan = planImport(existing, file.data, mode);
        // 스토어별 최종 상태를 통째로 교체한다 — merge 계획도 '최종 전체'를 담고 있어
        // 부분 갱신보다 결과가 명확하고, 이전에 쌓인 고아 레코드도 함께 정리된다.
        await dbReplaceAll(STORES.projects, plan.data.projects);
        await dbReplaceAll(STORES.documents, plan.data.documents);
        await dbReplaceAll(STORES.snapshots, plan.data.snapshots);
        await dbReplaceAll(STORES.notes, plan.data.notes);
        await dbReplaceAll(STORES.writingLogs, plan.data.writingLogs);
        await dbReplaceAll(STORES.events, plan.data.events);
        await dbReplaceAll(STORES.terms, plan.data.terms);
        await dbReplaceAll(STORES.ideas, plan.data.ideas);
        await dbReplaceAll(STORES.relations, plan.data.relations);
        await mutate(() => true); // 열려 있는 모든 SWR 키 재검증
        return { ok: true, summary: plan.summary };
      } catch {
        return { ok: false, error: "복원 중 문제가 생겼어요. 파일을 다시 확인해 주세요." };
      } finally {
        setBusy(false);
      }
    },
    [mutate],
  );

  return { lastBackupAt, status, busy, exportBackup, inspect, importBackup, countBackupData };
}
