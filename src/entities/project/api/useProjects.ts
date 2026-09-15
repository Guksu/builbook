"use client";

import useSWR from "swr";
import {
  STORES,
  dbGetAll,
  dbGetAllByProject,
  dbGet,
  dbPut,
  dbDelete,
  dbBulkDelete,
} from "@shared/db";
import { deleteSnapshotsForDocuments } from "@entities/snapshot";
import { deleteNotesForProject } from "@entities/note";
import { deleteWritingLogsForProject } from "@entities/writing-log";
import { deleteStoryEventsForProject } from "@entities/story-event";
import { deleteTermsForProject } from "@entities/term";
import type { Project } from "../model/types";
import type { ProjectLabel } from "../lib/labels";

const KEY = "projects";

// 단일 작품 SWR 키 — 목표 등 작품 단위 필드를 반응형으로 읽고 갱신할 때 사용.
export const projectKey = (id: string) => `project:${id}`;

async function listProjects(): Promise<Project[]> {
  const items = await dbGetAll<Project>(STORES.projects);
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// 단일 작품(작업실 화면 등)을 읽고 목표 단어 수를 갱신하는 훅.
export function useProject(projectId: string) {
  const { data, mutate } = useSWR<Project | undefined>(
    projectId ? projectKey(projectId) : null,
    () => dbGet<Project>(STORES.projects, projectId),
  );

  // 목표 필드 3종(작품 총량·하루·회차)은 저장 방식이 같아 한 함수로 처리한다.
  async function updateGoalField(
    field: "goal" | "dailyGoal" | "episodeGoal",
    value: number | null,
  ) {
    const p = await dbGet<Project>(STORES.projects, projectId);
    if (!p) return;
    await dbPut(STORES.projects, {
      ...p,
      [field]: value ?? undefined, // null이면 목표 해제
      updatedAt: new Date().toISOString(),
    });
    await mutate();
  }

  // 라벨 목록 통째 교체(추가·이름 변경·삭제 모두 이 한 함수로 — 순수 로직은 lib/labels가 만든다).
  async function updateLabels(labels: ProjectLabel[]) {
    const p = await dbGet<Project>(STORES.projects, projectId);
    if (!p) return;
    await dbPut(STORES.projects, {
      ...p,
      labels,
      updatedAt: new Date().toISOString(),
    });
    await mutate();
  }

  return {
    project: data ?? null,
    updateLabels,
    // 작품 목표 단어 수 설정. null이면 목표 해제(undefined 저장).
    updateGoal: (goal: number | null) => updateGoalField("goal", goal),
    // 하루 목표 단어 수(집필 현황 '오늘' 진행률 기준).
    updateDailyGoal: (goal: number | null) => updateGoalField("dailyGoal", goal),
    // 회차 목표 분량(공백 포함 글자 수).
    updateEpisodeGoal: (goal: number | null) => updateGoalField("episodeGoal", goal),
    // 마감일(YYYY-MM-DD). null이면 해제.
    async updateDeadline(deadline: string | null) {
      const p = await dbGet<Project>(STORES.projects, projectId);
      if (!p) return;
      await dbPut(STORES.projects, {
        ...p,
        deadline: deadline || undefined,
        updatedAt: new Date().toISOString(),
      });
      await mutate();
    },
  };
}

// 로컬(IndexedDB) 기반 작품 목록/생성. SWR로 캐시·재검증.
export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>(KEY, listProjects);

  return {
    projects: data ?? [],
    isLoading,
    error,
    mutate,
    async createProject(input: { title: string; description?: string }) {
      const title = input.title.trim();
      if (!title) return null; // 공백 제목 방어
      const now = new Date().toISOString();
      const project: Project = {
        id: crypto.randomUUID(),
        title,
        description: input.description?.trim() || null,
        createdAt: now,
        updatedAt: now,
      };
      await dbPut(STORES.projects, project);
      await mutate();
      return project;
    },
    async deleteProject(id: string) {
      // 작품에 속한 문서들도 함께 삭제(IndexedDB엔 onDelete Cascade가 없으므로 수동).
      const docs = await dbGetAllByProject<{ id: string }>(STORES.documents, id);
      const docIds = docs.map((d) => d.id);
      await dbBulkDelete(STORES.documents, docIds);
      // 딸린 스냅샷도 함께 정리 — 고아 스냅샷 누적 방지.
      await deleteSnapshotsForDocuments(docIds);
      // 딸린 리서치 노트(캐릭터·설정)도 함께 정리 — 고아 노트 누적 방지.
      await deleteNotesForProject(id);
      // 일별 집필 기록도 함께 정리 — 고아 기록 누적 방지.
      await deleteWritingLogsForProject(id);
      // 타임라인 사건도 함께 정리 — 고아 사건 누적 방지.
      await deleteStoryEventsForProject(id);
      // 고유명사 사전도 함께 정리 — 고아 용어 누적 방지.
      await deleteTermsForProject(id);
      await dbDelete(STORES.projects, id);
      await mutate();
    },
    async getProject(id: string) {
      return dbGet<Project>(STORES.projects, id);
    },
  };
}
