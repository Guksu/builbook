"use client";

// 리서치 노트를 바인더 카드로 옮기는 실행부. 작업실을 열 때 한 번 돈다.
// DB 업그레이드가 아니라 여기서 하는 이유: 옛 백업을 복원하면 노트가 다시 들어오기 때문이다.
// 원래 노트는 지우지 않는다(백업에도 그대로 남는다) — 옮긴 작품에는 notesMigrated 표시만 남긴다.

import { STORES, dbGet, dbGetAllByProject, dbBulkPut, dbPut } from "@shared/db";
import { extractPlainText, measureText } from "@shared/lib";
import type { Note } from "@entities/note";
import type { DocumentNode } from "@entities/document";
import type { Project } from "@entities/project";
import {
  RESEARCH_FOLDER_TITLE,
  cardIdForNote,
  noteKind,
  noteToCardContent,
  researchFolderId,
  sortNotesForCards,
} from "../lib/noteToCard";

/** 옮긴 카드 수를 돌려준다(옮길 것이 없거나 이미 옮겼으면 0). */
export async function migrateNotesToCards(projectId: string): Promise<number> {
  const project = await dbGet<Project>(STORES.projects, projectId);
  if (!project || project.notesMigrated) return 0;
  const notes = await dbGetAllByProject<Note>(STORES.notes, projectId);
  if (notes.length === 0) return 0;

  const docs = await dbGetAllByProject<DocumentNode>(STORES.documents, projectId);
  const existing = new Set(docs.map((d) => d.id));
  const ts = new Date().toISOString();
  const out: DocumentNode[] = [];

  const folderId = researchFolderId(projectId);
  if (!existing.has(folderId)) {
    const rootOrder = docs
      .filter((d) => d.parentId === null)
      .reduce((max, d) => Math.max(max, d.order + 1), 0);
    out.push({
      id: folderId,
      projectId,
      parentId: null,
      type: "FOLDER",
      title: RESEARCH_FOLDER_TITLE,
      order: rootOrder,
      content: null,
      synopsis: null,
      wordCount: 0,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  let order = docs
    .filter((d) => d.parentId === folderId)
    .reduce((max, d) => Math.max(max, d.order + 1), 0);
  for (const note of sortNotesForCards(notes)) {
    const id = cardIdForNote(note.id);
    if (existing.has(id)) continue;
    const content = noteToCardContent(note);
    const m = measureText(extractPlainText(content));
    out.push({
      id,
      projectId,
      parentId: folderId,
      type: "DOC",
      kind: noteKind(note),
      title: note.title.trim() || "이름 없는 노트",
      order: order++,
      content,
      synopsis: null,
      wordCount: m.words,
      charCount: m.chars,
      charCountNoSpace: m.charsNoSpace,
      createdAt: note.createdAt,
      updatedAt: ts,
    });
  }

  if (out.length) await dbBulkPut(STORES.documents, out);
  // 수정 시각은 건드리지 않는다 — 작품 목록 정렬('N 수정')이 옮기기만으로 바뀌면 안 된다.
  await dbPut(STORES.projects, { ...project, notesMigrated: true });
  return out.filter((d) => d.type === "DOC").length;
}
