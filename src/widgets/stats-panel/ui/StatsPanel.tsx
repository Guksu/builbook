"use client";

import { useMemo } from "react";
import { Input, ProgressBar, cn } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import {
  averagePerActiveDay,
  bestDay,
  buildSeries,
  computeStreak,
  dateKey,
  estimateDaysToGoal,
  longestStreak,
  totalWritten,
  useWritingLogs,
  writtenOn,
} from "@entities/writing-log";
import { computeProgress } from "@features/writing-goals";
import { useCountUnit } from "@features/count-unit";
import { formatCount, unitSuffix } from "@shared/lib";
import {
  DEFAULT_EPISODE_GOAL,
  EPISODE_PRESETS,
  buildEpisodeStats,
  episodeStatusLabel,
  summarizeEpisodes,
  type EpisodeStatus,
} from "@features/writing-stats";

export interface StatsPanelProps {
  projectId: string;
  documents: readonly DocumentNode[];
  /** 하루 목표 분량(사용자 설정 단위, 미설정 가능). */
  dailyGoal?: number;
  /** 회차 목표 분량(공백 포함 글자 수, 미설정 시 기본 5,500자). */
  episodeGoal?: number;
  /** 작품 전체 목표 분량 — 완성 예상일 계산에 쓴다. */
  projectGoal?: number;
  /** 작품 전체 현재 분량(실시간, 사용자 설정 단위). */
  projectWords: number;
  onSaveDailyGoal: (goal: number | null) => void;
  onSaveEpisodeGoal: (goal: number | null) => void;
  /** 회차 표에서 회차를 클릭했을 때 — 해당 문서를 에디터에 연다. */
  onSelectDocument?: (id: string) => void;
}

const SERIES_DAYS = 14;

const STATUS_STYLE: Record<EpisodeStatus, string> = {
  short: "text-warning",
  ok: "text-success-strong",
  long: "text-error",
};

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
 * 집필 현황 — 오늘 쓴 양·연속 집필일·최근 14일 추이·회차별 분량을 한 화면에.
 * 연재는 "매일 얼마씩 쌓았는가"와 "한 편이 몇 자인가"로 굴러가므로 이 둘을 나란히 둔다.
 */
export function StatsPanel({
  projectId,
  documents,
  dailyGoal,
  episodeGoal,
  projectGoal,
  projectWords,
  onSaveDailyGoal,
  onSaveEpisodeGoal,
  onSelectDocument,
}: StatsPanelProps) {
  const { logs, isLoading } = useWritingLogs(projectId);
  const [unit, setUnit] = useCountUnit();
  const today = dateKey(new Date());

  const todayWords = writtenOn(logs, today, unit);
  const todayProgress = computeProgress(todayWords, dailyGoal);
  const streak = computeStreak(logs, today);
  const best = longestStreak(logs);
  const series = useMemo(
    () => buildSeries(logs, today, SERIES_DAYS, unit),
    [logs, today, unit],
  );
  const peak = Math.max(1, ...series.map((d) => d.written));
  const perDay = averagePerActiveDay(logs, unit);
  const topDay = bestDay(logs, unit);
  const remaining = projectGoal ? Math.max(0, projectGoal - projectWords) : 0;
  const daysLeft = projectGoal ? estimateDaysToGoal(remaining, perDay) : null;

  const goalChars = episodeGoal && episodeGoal > 0 ? episodeGoal : DEFAULT_EPISODE_GOAL;
  const episodes = useMemo(
    () => buildEpisodeStats(documents, goalChars, unit),
    [documents, goalChars, unit],
  );
  const summary = summarizeEpisodes(episodes);

  return (
    <div className="flex h-full flex-col gap-20 overflow-y-auto">
      <h2 className="text-body font-medium text-fg">집필 현황</h2>

      {/* 오늘 */}
      <section className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between text-body-sm">
          <span className="text-fg-weak">오늘 쓴 분량</span>
          <span className="tabular-nums text-fg">
            {todayProgress.hasGoal
              ? `${todayWords.toLocaleString("ko-KR")} / ${formatCount(todayProgress.goal, unit)}`
              : formatCount(todayWords, unit)}
          </span>
        </div>
        {todayProgress.hasGoal && (
          <ProgressBar
            value={todayProgress.clampedPercent}
            reached={todayProgress.reached}
            aria-label="오늘 목표 진행률"
          />
        )}
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label="하루 목표 분량"
          defaultValue={dailyGoal && dailyGoal > 0 ? String(dailyGoal) : ""}
          placeholder={`하루 목표 분량 (${unitSuffix(unit)}, 선택)`}
          className="h-32 text-body-sm"
          onBlur={(e) => commitGoal(e.target.value, dailyGoal, onSaveDailyGoal)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </section>

      {/* 연속 집필일 */}
      <section className="flex gap-12">
        <div className="flex-1 rounded-md border border-border bg-surface p-12">
          <p className="text-caption text-fg-weak">연속 집필</p>
          <p className="text-h3 tabular-nums text-fg">{streak}일</p>
        </div>
        <div className="flex-1 rounded-md border border-border bg-surface p-12">
          <p className="text-caption text-fg-weak">최장 기록</p>
          <p className="text-h3 tabular-nums text-fg">{best}일</p>
        </div>
      </section>

      {/* 최근 14일 추이 */}
      <section className="flex flex-col gap-6">
        <p className="text-body-sm text-fg-weak">최근 {SERIES_DAYS}일</p>
        <ul
          aria-label="최근 집필량 추이"
          className="flex h-64 items-end gap-2"
        >
          {series.map((d) => (
            <li
              key={d.date}
              title={`${d.date} · ${formatCount(d.written, unit)}`}
              className="flex-1"
            >
              <div
                className={cn(
                  "w-full rounded-sm",
                  d.written > 0 ? "bg-primary" : "bg-surface border border-border",
                )}
                style={{ height: `${Math.max(4, (d.written / peak) * 64)}px` }}
              />
            </li>
          ))}
        </ul>
        {isLoading && <p className="text-caption text-fg-weak">불러오는 중…</p>}
      </section>

      {/* 요약 */}
      <section className="flex flex-col gap-4 text-body-sm">
        <div className="flex justify-between">
          <span className="text-fg-weak">누적 집필량</span>
          <span className="tabular-nums text-fg">
            {formatCount(totalWritten(logs, unit), unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-fg-weak">쓴 날 평균</span>
          <span className="tabular-nums text-fg">{formatCount(perDay, unit)}</span>
        </div>
        {topDay && (
          <div className="flex justify-between">
            <span className="text-fg-weak">가장 많이 쓴 날</span>
            <span className="tabular-nums text-fg">
              {topDay.date} · {formatCount(topDay.written, unit)}
            </span>
          </div>
        )}
        {projectGoal ? (
          <div className="flex justify-between">
            <span className="text-fg-weak">이 페이스로 완성까지</span>
            <span className="tabular-nums text-fg">
              {daysLeft === null
                ? "기록이 더 필요해요"
                : daysLeft === 0
                  ? "목표 달성!"
                  : `약 ${daysLeft.toLocaleString("ko-KR")}일`}
            </span>
          </div>
        ) : null}
      </section>

      {/* 회차 분량 */}
      <section className="flex flex-col gap-8 border-t border-border pt-16">
        <div className="flex items-baseline justify-between">
          <p className="text-body-sm font-medium text-fg">회차 분량</p>
          <p className="text-caption text-fg-weak">
            {summary.count}편 · 평균 {formatCount(summary.averageChars, unit)}
          </p>
        </div>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label="회차 목표 분량"
          defaultValue={episodeGoal && episodeGoal > 0 ? String(episodeGoal) : ""}
          placeholder={`회차 목표 분량 (기본 ${formatCount(DEFAULT_EPISODE_GOAL, "chars")}, 단위: ${unitSuffix(unit)})`}
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
                onClick={() => {
                  if (p.unit !== unit) setUnit(p.unit);
                  if (p.goal !== episodeGoal) onSaveEpisodeGoal(p.goal);
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

        {episodes.length === 0 ? (
          <p className="text-body-sm text-fg-weak">아직 회차가 없어요.</p>
        ) : (
          <ul aria-label="회차 분량 목록" className="flex flex-col gap-2">
            {episodes.map((ep) => (
              <li key={ep.id}>
                <button
                  type="button"
                  onClick={() => onSelectDocument?.(ep.id)}
                  className="flex w-full items-center justify-between gap-8 rounded-md px-8 py-6 text-left hover:bg-surface"
                >
                  <span className="min-w-0 flex-1 truncate text-body-sm text-fg">
                    <span className="mr-6 text-caption tabular-nums text-fg-weak">
                      {ep.episodeNo}화
                    </span>
                    {ep.title}
                  </span>
                  <span className="shrink-0 text-caption tabular-nums text-fg-weak">
                    {formatCount(ep.chars, unit)}
                  </span>
                  <span className={cn("w-32 shrink-0 text-right text-caption", STATUS_STYLE[ep.status])}>
                    {episodeStatusLabel(ep.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
