"use client";

import useSWR from "swr";
import { STORES, dbGetAll, dbGet, dbPut, dbDelete } from "@shared/db";
import type { Project } from "../model/types";

const KEY = "projects";

async function listProjects(): Promise<Project[]> {
  const items = await dbGetAll<Project>(STORES.projects);
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
      const now = new Date().toISOString();
      const project: Project = {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await dbPut(STORES.projects, project);
      await mutate();
      return project;
    },
    async deleteProject(id: string) {
      await dbDelete(STORES.projects, id);
      await mutate();
    },
    async getProject(id: string) {
      return dbGet<Project>(STORES.projects, id);
    },
  };
}
