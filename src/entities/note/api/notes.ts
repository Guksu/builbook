"use client";

import { STORES, dbBulkDelete, dbGetAllByProject } from "@shared/db";
import type { Note } from "../model/types";

// 리서치 노트는 2026-10부터 바인더 인물·설정 카드로 옮겨진다(features/notes-to-cards).
// 노트를 만들고 고치는 화면은 없어졌고, 남은 기록은 백업과 옮기기에만 쓰인다.

// 작품이 삭제될 때 딸린 노트를 함께 지운다 — IndexedDB엔 Cascade가 없으므로 수동.
// useProjects.deleteProject에서 호출한다. 호출 안 하면 고아 노트가 영구 누적된다.
export async function deleteNotesForProject(projectId: string): Promise<void> {
  const notes = await dbGetAllByProject<Note>(STORES.notes, projectId);
  const ids = notes.map((n) => n.id);
  if (ids.length) {
    await dbBulkDelete(STORES.notes, ids);
  }
}
