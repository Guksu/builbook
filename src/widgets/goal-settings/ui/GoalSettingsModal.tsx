"use client";

import { Button, Input, Modal, cn } from "@shared/ui";
import { formatCount, unitSuffix } from "@shared/lib";
import { dateKey } from "@entities/writing-log";
import { CountUnitSelect, useCountUnit } from "@features/count-unit";
import { GoalMeter, computeProgress, paceToDeadline } from "@features/writing-goals";
import { DEFAULT_EPISODE_GOAL, EPISODE_PRESETS } from "@features/writing-stats";

export interface GoalSettingsModalProps {
  open: boolean;
  onClose: () => void;
  /** 작품 전체 현재 분량(실시간, 사용자 설정 단위). */
  projectTotal: number;
  /** 오늘 새로 쓴 분량(사용자 설정 단위). */
  todayWritten: number;
  projectGoal?: number;
  deadline?: string;
  dailyGoal?: number;
  episodeGoal?: number;
  onSaveProjectGoal: (goal: number | null) => void;
  onSaveDeadline: (deadline: string | null) => void;
  onSaveDailyGoal: (goal: number | null) => void;
  onSaveEpisodeGoal: (goal: number | null) => void;
}

// 숫자 목표 입력 커밋 — 빈 값이면 해제(null), 0 이상 정수만 저장.
function commitGoal(raw: string, current: number | undefined, onSave: (g: number | null) => void) {
  const trimmed = raw.trim();
  if (trimmed === "") {
    if (current != null) onSave(null);
    return;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return;
  const next = Math.floor(n);
  if (next !== (current ?? -1)) onSave(next);
}

/**
 * 목표 창 — 작품 목표·마감일·하루 목표·회차 목표·분량 단위를 한 곳에서 정한다.
 * 예전에는 작품 목표·마감일은 인스펙터, 하루·회차 목표는 현황 패널에 있어 목표 바를 눌러도
 * 원하는 칸이 안 나왔다(2026-10 정리). 입력은 지금처럼 포커스가 빠질 때 바로 저장된다.
 */
export function GoalSettingsModal({
  open,
  onClose,
  projectTotal,
  todayWritten,
  projectGoal,
  deadline,
  dailyGoal,
  episodeGoal,
  onSaveProjectGoal,
  onSaveDeadline,
  onSaveDailyGoal,
  onSaveEpisodeGoal,
}: GoalSettingsModalProps) {
  const [unit, setUnit] = useCountUnit();
  const projectProgress = computeProgress(projectTotal, projectGoal);
  const pace = deadline ? paceToDeadline(projectProgress.remaining, deadline, dateKey(new Date())) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="목표"
      description="숫자는 모두 아래 분량 단위로 셉니다. 칸에서 나가면 바로 저장돼요."
      className="max-h-[90vh] overflow-y-auto"
      footer={<Button onClick={onClose}>닫기</Button>}
    >
      <div className="flex flex-col gap-16 text-body-sm">
        <CountUnitSelect id="goal-count-unit" />
        <div className="h-px bg-border" />

        <GoalMeter
          id="project-goal"
          label="작품 전체"
          inputLabel="작품 목표 분량"
          current={projectTotal}
          goal={projectGoal}
          onSave={onSaveProjectGoal}
        />
        <div className="flex flex-col gap-6">
          <label htmlFor="deadline" className="text-fg-weak">
            마감일
          </label>
          <Input
            id="deadline"
            type="date"
            aria-label="마감일"
            value={deadline ?? ""}
            onChange={(e) => onSaveDeadline(e.target.value || null)}
            className="h-32 text-body-sm"
          />
          {pace && projectProgress.hasGoal && (
            <p className="text-caption text-fg-weak" aria-label="마감 페이스">
              {projectProgress.reached
                ? "목표를 이미 채웠어요."
                : pace.overdue
                  ? `마감이 지났어요. 남은 분량 ${formatCount(pace.perDay, unit)}`
                  : `${pace.daysLeft}일 남음 · 하루 ${formatCount(pace.perDay, unit)}씩`}
            </p>
          )}
          {deadline && !projectProgress.hasGoal && (
            <p className="text-caption text-fg-weak">작품 목표를 넣으면 하루 분량이 계산돼요.</p>
          )}
        </div>
        <div className="h-px bg-border" />

        <GoalMeter
          id="daily-goal"
          label="오늘"
          inputLabel="하루 목표 분량"
          current={todayWritten}
          goal={dailyGoal}
          onSave={onSaveDailyGoal}
        />
        <div className="h-px bg-border" />

        <div className="flex flex-col gap-6">
          <label htmlFor="episode-goal" className="text-fg-weak">
            회차 한 편
          </label>
          <Input
            id="episode-goal"
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="회차 목표 분량"
            defaultValue={episodeGoal && episodeGoal > 0 ? String(episodeGoal) : ""}
            placeholder={`회차 목표 분량 (기본 ${DEFAULT_EPISODE_GOAL.toLocaleString("ko-KR")}, 단위: ${unitSuffix(unit)})`}
            className="h-32 text-body-sm"
            onBlur={(e) => commitGoal(e.target.value, episodeGoal, onSaveEpisodeGoal)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          {/* 플랫폼 프리셋 — 누르면 목표와 분량 단위를 함께 맞춘다. 근거는 title로. */}
          <ul aria-label="회차 분량 프리셋" className="flex flex-wrap gap-4">
            {EPISODE_PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  title={p.source}
                  onClick={(e) => {
                    if (p.unit !== unit) setUnit(p.unit);
                    if (p.goal !== episodeGoal) onSaveEpisodeGoal(p.goal);
                    // 입력칸은 defaultValue라 직접 맞춰 준다(창을 닫지 않고 숫자가 바뀌어 보이게).
                    const input = e.currentTarget.closest("div")?.querySelector<HTMLInputElement>("#episode-goal");
                    if (input) input.value = String(p.goal);
                  }}
                  className={cn(
                    "rounded-full border px-8 py-2 text-caption transition-colors",
                    episodeGoal === p.goal && unit === p.unit
                      ? "border-primary bg-primary-weak text-fg"
                      : "border-border text-fg-weak hover:border-border-strong hover:text-fg",
                  )}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
