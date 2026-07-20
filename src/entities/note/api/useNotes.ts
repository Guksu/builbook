"use client";

import useSWR from "swr";
import {
  STORES,
  dbPut,
  dbDelete,
  dbBulkDelete,
  dbGetAllByProject,
} from "@shared/db";
import { sortNotes } from "../lib/notes";
import type { Note, NoteCategory } from "../model/types";

// 노트 목록 SWR 키 — 작품 단위. 외부에서 무효화할 때 동일 키 사용.
export const notesKey = (projectId: string) => `notes:${projectId}`;

const now = () => new Date().toISOString();

function listByProject(projectId: string) {
  return dbGetAllByProject<Note>(STORES.notes, projectId);
}

// 작품이 삭제될 때 딸린 노트를 함께 지운다 — IndexedDB엔 Cascade가 없으므로 수동.
// useProjects.deleteProject에서 호출한다. 호출 안 하면 고아 노트가 영구 누적된다.
export async function deleteNotesForProject(projectId: string): Promise<void> {
  const notes = await dbGetAllByProject<Note>(STORES.notes, projectId);
  const ids = notes.map((n) => n.id);
  if (ids.length) {
    await dbBulkDelete(STORES.notes, ids);
  }
}

export interface CreateNoteInput {
  projectId: string;
  category: NoteCategory;
  title: string;
  role?: string | null;
  body?: string;
}

export interface UpdateNoteInput {
  title: string;
  role?: string | null;
  body?: string;
}

export function useNotes(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<Note[]>(
    projectId ? notesKey(projectId) : null,
    () => listByProject(projectId),
  );

  // 최근 수정순 정렬(순수 로직은 entities/note/lib가 소유).
  const notes = sortNotes(data ?? []);

  return {
    notes,
    isLoading,
    error,
    mutate,

    async createNote(input: CreateNoteInput) {
      const title = input.title.trim();
      if (!title) return null; // 공백 제목 방어
      const ts = now();
      const note: Note = {
        id: crypto.randomUUID(),
        projectId: input.projectId,
        category: input.category,
        title,
        role: input.role?.trim() ? input.role.trim() : null,
        body: input.body?.trim() ?? "",
        createdAt: ts,
        updatedAt: ts,
      };
      await dbPut(STORES.notes, note);
      await mutate();
      return note;
    },

    async updateNote(id: string, input: UpdateNoteInput) {
      const current = (data ?? []).find((n) => n.id === id);
      if (!current) return null;
      const title = input.title.trim();
      if (!title) return null; // 공백 제목 방어
      const next: Note = {
        ...current,
        title,
        role: input.role?.trim() ? input.role.trim() : null,
        body: input.body?.trim() ?? "",
        updatedAt: now(),
      };
      await dbPut(STORES.notes, next);
      await mutate();
      return next;
    },

    async deleteNote(id: string) {
      await dbDelete(STORES.notes, id);
      await mutate();
    },
  };
}
