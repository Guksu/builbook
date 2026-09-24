"use client";

import useSWR, { mutate as globalMutate } from "swr";
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
import { deleteIdeasForProject } from "@entities/idea";
import { deleteRelationsForProject } from "@entities/relation";
import type { Project, CompilePreset, AiModelChoice, NodePosition } from "../model/types";
import type { ProjectLabel } from "../lib/labels";

const KEY = "projects";

// 단일 작품 SWR 키 — 목표 등 작품 단위 필드를 반응형으로 읽고 갱신할 때 사용.
export const projectKey = (id: string) => `project:${id}`;

async function listProjects(): Promise<Project[]> {
  const items = await dbGetAll<Project>(STORES.projects);
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// 작품 제목 변경. 작품 목록(대시보드)과 단일 작품(작업실 헤더)이 서로 다른 SWR 키로 읽으므로
// 두 캐시를 함께 갱신한다. 공백 제목이거나 작품이 없으면 false.
async function renameProject(id: string, title: string): Promise<boolean> {
  const next = title.trim();
  if (!next) return false; // 공백 제목 방어
  const p = await dbGet<Project>(STORES.projects, id);
  if (!p) return false;
  if (p.title === next) return true; // 바뀐 게 없으면 수정 시각도 건드리지 않는다
  await dbPut(STORES.projects, { ...p, title: next, updatedAt: new Date().toISOString() });
  await Promise.all([globalMutate(KEY), globalMutate(projectKey(id))]);
  return true;
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
    // 작품 제목 변경(작업실 헤더). 작품 목록 캐시도 함께 갱신된다.
    renameProject: (title: string) => renameProject(projectId, title),
    // 작품 목표 단어 수 설정. null이면 목표 해제(undefined 저장).
    updateGoal: (goal: number | null) => updateGoalField("goal", goal),
    // 하루 목표 단어 수(집필 현황 '오늘' 진행률 기준).
    updateDailyGoal: (goal: number | null) => updateGoalField("dailyGoal", goal),
    // 회차 목표 분량(공백 포함 글자 수).
    updateEpisodeGoal: (goal: number | null) => updateGoalField("episodeGoal", goal),
    // 컴파일 프리셋 목록 통째 교체.
    async updateCompilePresets(presets: CompilePreset[]) {
      const p = await dbGet<Project>(STORES.projects, projectId);
      if (!p) return;
      await dbPut(STORES.projects, { ...p, compilePresets: presets, updatedAt: new Date().toISOString() });
      await mutate();
    },
    // 작품 장르 키(영감 서랍 카드 덱). null이면 해제.
    async updateGenre(genre: string | null) {
      const p = await dbGet<Project>(STORES.projects, projectId);
      if (!p) return;
      await dbPut(STORES.projects, { ...p, genre: genre ?? undefined, updatedAt: new Date().toISOString() });
      await mutate();
    },
    // AI 발상 모델 선택.
    async updateAiModel(aiModel: AiModelChoice) {
      const p = await dbGet<Project>(STORES.projects, projectId);
      if (!p) return;
      await dbPut(STORES.projects, { ...p, aiModel, updatedAt: new Date().toISOString() });
      await mutate();
    },
    // 관계도 노드 배치 통째 교체(드래그를 놓을 때 한 번).
    async updateRelationLayout(layout: Record<string, NodePosition>) {
      const p = await dbGet<Project>(STORES.projects, projectId);
      if (!p) return;
      await dbPut(STORES.projects, { ...p, relationLayout: layout, updatedAt: new Date().toISOString() });
      await mutate();
    },
    // 관계 종류 하나의 색 지정(라벨 색 이름). null이면 기본 색으로 되돌림.
    async updateRelationTypeColor(type: string, color: string | null) {
      const p = await dbGet<Project>(STORES.projects, projectId);
      if (!p) return;
      const next = { ...(p.relationTypeColors ?? {}) };
      if (color) next[type] = color;
      else delete next[type];
      await dbPut(STORES.projects, { ...p, relationTypeColors: next, updatedAt: new Date().toISOString() });
      await mutate();
    },
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
      // 영감 서랍 메모도 함께 정리.
      await deleteIdeasForProject(id);
      // 인물 관계선도 함께 정리.
      await deleteRelationsForProject(id);
      await dbDelete(STORES.projects, id);
      await mutate();
    },
    // 작품 제목 변경(대시보드 카드). 작업실이 쓰는 단일 작품 캐시도 함께 갱신된다.
    renameProject,
    async getProject(id: string) {
      return dbGet<Project>(STORES.projects, id);
    },
  };
}
