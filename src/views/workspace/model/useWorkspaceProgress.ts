"use client";

// 작업실의 분량·목표 계산. 작품 총 분량(편집 중인 문서만 실시간 값으로 치환)과
// 헤더 목표 바가 쓰는 작품/오늘 진행률·마감 페이스, 집중 모드 진행률을 한 번에 만든다.

import { useMemo } from "react";
import { docCount, sumDocCounts, type DocumentNode } from "@entities/document";
import { computeProgress, paceToDeadline, type GoalProgress } from "@features/writing-goals";
import { useWritingLogs, writtenOn, dateKey } from "@entities/writing-log";
import type { CountUnit } from "@shared/lib";
import type { ProjectApi } from "./types";

interface UseWorkspaceProgressParams {
  projectId: string;
  documents: DocumentNode[];
  selected: DocumentNode | null;
  /** 현재 편집 중인 문서의 실시간 분량(선택 단위 기준). */
  liveWords: number;
  unit: CountUnit;
  project: ProjectApi["project"];
}

export function useWorkspaceProgress({
  projectId,
  documents,
  selected,
  liveWords,
  unit,
  project,
}: UseWorkspaceProgressParams): {
  projectTotalWords: number;
  focusProgress: GoalProgress;
  projectProgress: GoalProgress;
  todayProgress: GoalProgress;
  pace: ReturnType<typeof paceToDeadline>;
} {
  const { logs: writingLogs } = useWritingLogs(projectId);

  // 작품 전체 분량 = 저장된 합계에서 현재 편집 문서만 실시간 값으로 치환.
  const projectTotalWords = useMemo(() => {
    const base = sumDocCounts(documents, unit);
    if (!selected || selected.type !== "DOC") return base;
    return base - docCount(selected, unit) + liveWords;
  }, [documents, selected, liveWords, unit]);

  // 집중 모드 하단에 은은하게 띄울 문서 목표 진행률.
  const focusProgress = computeProgress(liveWords, selected?.goal);

  // 헤더 목표 바 — 작품·오늘 진행률 + 마감 페이스(스크리브너 Project Targets).
  const todayKey = dateKey(new Date());
  const projectProgress = computeProgress(projectTotalWords, project?.goal);
  const todayProgress = computeProgress(writtenOn(writingLogs, todayKey, unit), project?.dailyGoal);
  const pace = project?.deadline
    ? paceToDeadline(projectProgress.remaining, project.deadline, todayKey)
    : null;

  return { projectTotalWords, focusProgress, projectProgress, todayProgress, pace };
}
