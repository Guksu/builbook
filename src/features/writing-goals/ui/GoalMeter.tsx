"use client";

import { Input, ProgressBar, cn } from "@shared/ui";
import { computeProgress } from "../lib/progress";

interface GoalMeterProps {
  /** 좌측 라벨(예: "이 문서", "작품 전체") */
  label: string;
  /** 현재 단어 수 */
  current: number;
  /** 목표 단어 수 — undefined/null/0 이면 "목표 미설정" */
  goal: number | null | undefined;
  /** 목표 저장 콜백. 빈 입력이면 null(미설정) */
  onSave: (goal: number | null) => void;
  /** input 식별자(라벨 연결용) */
  id: string;
  /** 스크린리더/테스트용 접근 이름 */
  inputLabel: string;
}

// 목표 카운터 한 칸: 현재/목표 수치 + 진행률 바 + 목표 편집 입력.
// 진입장벽을 낮추기 위해 목표는 '선택'이며 미설정 시 진행률 바를 숨긴다.
export function GoalMeter({
  label,
  current,
  goal,
  onSave,
  id,
  inputLabel,
}: GoalMeterProps) {
  const p = computeProgress(current, goal);

  // 입력값 커밋: 빈 값 → 미설정(null), 0 이상 정수만 저장, 변화 없으면 무시.
  function commit(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (goal != null) onSave(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return;
    const next = Math.floor(n);
    if (next !== (goal ?? -1)) onSave(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <span className="text-fg-weak">{label}</span>
        <span className="tabular-nums text-fg">
          {p.current.toLocaleString("ko-KR")}
          {p.hasGoal ? ` / ${p.goal.toLocaleString("ko-KR")}` : ""}단어
        </span>
      </div>

      {p.hasGoal && (
        <div className="flex items-center gap-8">
          <ProgressBar
            value={p.clampedPercent}
            reached={p.reached}
            aria-label={`${label} 진행률`}
            className="flex-1"
          />
          <span
            className={cn(
              "w-40 shrink-0 text-right text-caption tabular-nums",
              p.reached ? "text-success-strong" : "text-fg-weak",
            )}
          >
            {p.reached ? "달성" : `${p.percent}%`}
          </span>
        </div>
      )}

      <Input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={inputLabel}
        defaultValue={goal != null && goal > 0 ? String(goal) : ""}
        placeholder="목표 단어 수 (선택)"
        className="h-32 text-body-sm"
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
