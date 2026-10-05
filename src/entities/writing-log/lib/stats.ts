// 집필 통계 순수 함수 — 날짜 계산·연속일·구간 합계. UI/DB 비종속이라 단위 테스트가 쉽다.
// 날짜는 전부 '로컬 시간 기준 YYYY-MM-DD' 문자열로 다룬다. UTC로 다루면 한국 시간 새벽에
// 쓴 글이 어제로 기록돼 연속 집필일이 끊긴 것처럼 보인다.

import type { WritingLog } from "../model/types";
import { DEFAULT_COUNT_UNIT, type CountUnit } from "@shared/lib";

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const logId = (projectId: string, date: string) => `${projectId}:${date}`;

// YYYY-MM-DD에서 n일 전/후 키. 로컬 자정 기준으로 더해 서머타임·월말을 Date에 맡긴다.
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1);
  base.setDate(base.getDate() + days);
  return dateKey(base);
}

export interface WritingDelta {
  words: number;
  chars: number; // 공백 포함 글자 수
  charsNoSpace: number; // 공백 제외 글자 수
}

const safeInt = (n: number) => (Number.isFinite(n) ? Math.trunc(n) : 0);

/**
 * 저장 시점의 변화량을 그날 기록에 더한다(없으면 새로 만든다).
 * 단어·글자(공백 포함/제외) 세 수치를 함께 쌓는다 — 양수만 written에, net은 지운 만큼 깎인다.
 */
export function applyDelta(
  existing: WritingLog | undefined,
  input: { projectId: string; date: string; delta: WritingDelta; now: string },
): WritingLog {
  const words = safeInt(input.delta.words);
  const chars = safeInt(input.delta.chars);
  const charsNoSpace = safeInt(input.delta.charsNoSpace);
  const base: WritingLog = existing ?? {
    id: logId(input.projectId, input.date),
    projectId: input.projectId,
    date: input.date,
    net: 0,
    written: 0,
    netChars: 0,
    writtenChars: 0,
    netCharsNoSpace: 0,
    writtenCharsNoSpace: 0,
    updatedAt: input.now,
  };
  return {
    ...base,
    net: base.net + words,
    written: base.written + Math.max(0, words),
    netChars: (base.netChars ?? 0) + chars,
    writtenChars: (base.writtenChars ?? 0) + Math.max(0, chars),
    // 공백 제외 수치가 없는 그날 기록(2026-10 이전에 만든 기록)은 공백 포함 값에서 이어 간다.
    // 0에서 시작하면 같은 날 숫자가 갑자기 줄어든 것처럼 보인다(읽을 때의 대체 규칙과 같다).
    netCharsNoSpace: (base.netCharsNoSpace ?? base.netChars ?? 0) + charsNoSpace,
    writtenCharsNoSpace:
      (base.writtenCharsNoSpace ?? base.writtenChars ?? 0) + Math.max(0, charsNoSpace),
    updatedAt: input.now,
  };
}

/**
 * 그날 새로 쓴 분량을 단위에 맞게 꺼낸다. 옛 기록은 있는 값 중 가장 가까운 것으로 대신한다 —
 * 공백 제외 수치가 없으면(2026-10 이전) 공백 포함 값, 글자 수가 없으면(2026-09 이전) 단어 수.
 * 정확하진 않지만 "썼다/안 썼다"와 상대 크기는 보존된다.
 */
export function writtenValue(log: WritingLog, unit: CountUnit): number {
  if (unit === "words") return log.written;
  if (unit === "charsNoSpace") return log.writtenCharsNoSpace ?? log.writtenChars ?? log.written;
  return log.writtenChars ?? log.written;
}

const byDate = (logs: readonly WritingLog[]) =>
  new Map(logs.map((l) => [l.date, l] as const));

/**
 * 연속 집필일 — 오늘부터 거꾸로 '쓴 날'이 이어진 길이.
 * 오늘 아직 안 썼으면 어제까지의 연속을 그대로 보여준다(하루 종일 0으로 보이면
 * 이어온 기록이 끊긴 줄 알고 의욕이 꺾인다 — 자정까지는 유예).
 */
export function computeStreak(logs: readonly WritingLog[], todayKey: string): number {
  const map = byDate(logs);
  const wroteOn = (key: string) => (map.get(key)?.written ?? 0) > 0;
  let cursor = wroteOn(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
  let streak = 0;
  while (wroteOn(cursor)) {
    streak++;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

/** 최장 연속 집필일 — 기록 전체에서 가장 길게 이어진 구간. */
export function longestStreak(logs: readonly WritingLog[]): number {
  const days = logs
    .filter((l) => l.written > 0)
    .map((l) => l.date)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    run = prev && shiftDateKey(prev, 1) === day ? run + 1 : 1;
    prev = day;
    best = Math.max(best, run);
  }
  return best;
}

export interface DayPoint {
  date: string;
  written: number;
}

/** 최근 n일 시계열(기록 없는 날은 0). 막대그래프가 그대로 소비한다. */
export function buildSeries(
  logs: readonly WritingLog[],
  todayKey: string,
  days: number,
  unit: CountUnit = DEFAULT_COUNT_UNIT,
): DayPoint[] {
  const map = byDate(logs);
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDateKey(todayKey, -i);
    const log = map.get(date);
    out.push({ date, written: log ? writtenValue(log, unit) : 0 });
  }
  return out;
}

export function writtenOn(
  logs: readonly WritingLog[],
  dateKeyValue: string,
  unit: CountUnit = DEFAULT_COUNT_UNIT,
): number {
  const log = byDate(logs).get(dateKeyValue);
  return log ? writtenValue(log, unit) : 0;
}

export function totalWritten(logs: readonly WritingLog[], unit: CountUnit = DEFAULT_COUNT_UNIT): number {
  return logs.reduce((sum, l) => sum + Math.max(0, writtenValue(l, unit)), 0);
}

/** 쓴 날이 있는 기록만 센다 — 평균 계산의 분모(안 쓴 날로 평균을 깎지 않는다). */
export function activeDays(logs: readonly WritingLog[]): number {
  return logs.filter((l) => l.written > 0).length;
}

export function averagePerActiveDay(
  logs: readonly WritingLog[],
  unit: CountUnit = DEFAULT_COUNT_UNIT,
): number {
  const days = activeDays(logs);
  return days ? Math.round(totalWritten(logs, unit) / days) : 0;
}

/** 가장 많이 쓴 날. 기록이 없으면 null. */
export function bestDay(logs: readonly WritingLog[], unit: CountUnit = DEFAULT_COUNT_UNIT): DayPoint | null {
  let best: DayPoint | null = null;
  for (const l of logs) {
    const v = writtenValue(l, unit);
    if (v > 0 && (!best || v > best.written)) {
      best = { date: l.date, written: v };
    }
  }
  return best;
}

/**
 * 남은 분량과 최근 속도로 완성 예상일을 잡는다. 속도가 0이면 null(예측 불가).
 * "이 페이스면 며칠"은 연재 계획을 세울 때 가장 자주 하는 계산이다.
 */
export function estimateDaysToGoal(
  remaining: number,
  perActiveDay: number,
): number | null {
  if (remaining <= 0) return 0;
  if (perActiveDay <= 0) return null;
  return Math.ceil(remaining / perActiveDay);
}
