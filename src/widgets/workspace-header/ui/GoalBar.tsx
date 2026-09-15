"use client";

import { cn } from "@shared/ui";
import { formatCount, type CountUnit } from "@shared/lib";
import type { GoalProgress, Pace } from "@features/writing-goals";

interface GoalBarProps {
  project: GoalProgress;
  today: GoalProgress;
  pace: Pace | null;
  unit: CountUnit;
  onClick?: () => void;
}

/**
 * 헤더의 목표 바 — 스크리브너 Project Targets를 한 줄로 접은 것.
 * 작품·오늘 진행률을 얇은 막대 두 개로, 마감이 있으면 "하루 N자"까지. 목표가 하나도 없으면 안 그린다.
 */
export function GoalBar({ project, today, pace, unit, onClick }: GoalBarProps) {
  if (!project.hasGoal && !today.hasGoal) return null;
  const parts: string[] = [];
  if (project.hasGoal) parts.push(`작품 ${project.reached ? "달성" : `${project.percent}%`}`);
  if (today.hasGoal) parts.push(`오늘 ${today.reached ? "달성" : `${today.percent}%`}`);
  if (pace && project.hasGoal && !project.reached) {
    parts.push(
      pace.overdue
        ? "마감 지남"
        : `마감까지 ${pace.daysLeft}일 · 하루 ${formatCount(pace.perDay, unit)}`,
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title="집필 현황 열기"
      aria-label={`목표 진행: ${parts.join(", ")}`}
      className="flex min-w-0 shrink-0 items-center gap-8 rounded-md px-8 py-4 text-caption text-fg-weak transition-colors hover:bg-surface hover:text-fg max-md:hidden"
    >
      <span className="flex w-64 flex-col gap-2" aria-hidden>
        {project.hasGoal && <Bar value={project.clampedPercent} reached={project.reached} />}
        {today.hasGoal && <Bar value={today.clampedPercent} reached={today.reached} />}
      </span>
      <span className="truncate tabular-nums">{parts.join(" · ")}</span>
    </button>
  );
}

function Bar({ value, reached }: { value: number; reached: boolean }) {
  return (
    <span className="block h-4 w-full overflow-hidden rounded-full bg-border">
      <span
        className={cn("block h-full rounded-full", reached ? "bg-success" : "bg-primary")}
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </span>
  );
}
