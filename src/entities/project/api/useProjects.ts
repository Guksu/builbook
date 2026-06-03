"use client";

import useSWR from "swr";
import { fetcher, apiSend } from "@shared/api";
import type { Project } from "../model/types";

// GET /api/projects → { items: Project[] } — 반드시 .items unwrap.
export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<{ items: Project[] }>(
    "/api/projects",
    fetcher,
  );
  return {
    projects: data?.items ?? [], // 배열 보장
    isLoading,
    error,
    mutate,
    async createProject(input: { title: string; description?: string }) {
      const created = (await apiSend("/api/projects", "POST", input)) as Project;
      await mutate();
      return created;
    },
  };
}
