// 집필 통계 순수 함수 — 날짜 계산·연속일·구간 합계. UI/DB 비종속이라 단위 테스트가 쉽다.
// 날짜는 전부 '로컬 시간 기준 YYYY-MM-DD' 문자열로 다룬다. UTC로 다루면 한국 시간 새벽에
// 쓴 글이 어제로 기록돼 연속 집필일이 끊긴 것처럼 보인다.

import type { WritingLog } from "../model/types";

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

/**
 * 저장 시점의 변화량을 그날 기록에 더한다(없으면 새로 만든다).
 * delta는 문서 단어 수의 증감 — 양수만 written에 쌓이고, net은 지운 만큼 깎인다.
 */
export function applyDelta(
  existing: WritingLog | undefined,
  input: { projectId: string; date: string; delta: number; now: string },
): WritingLog {
  const delta = Number.isFinite(input.delta) ? Math.trunc(input.delta) : 0;
  const base: WritingLog = existing ?? {
    id: logId(input.projectId, input.date),
    projectId: input.projectId,
    date: input.date,
    net: 0,
    written: 0,
    updatedAt: input.now,
  };
  return {
    ...base,
    net: base.net + delta,
    written: base.written + Math.max(0, delta),
    updatedAt: input.now,
  };
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
): DayPoint[] {
  const map = byDate(logs);
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDateKey(todayKey, -i);
    out.push({ date, written: map.get(date)?.written ?? 0 });
  }
  return out;
}

export function writtenOn(logs: readonly WritingLog[], dateKeyValue: string): number {
  return byDate(logs).get(dateKeyValue)?.written ?? 0;
}

export function totalWritten(logs: readonly WritingLog[]): number {
  return logs.reduce((sum, l) => sum + Math.max(0, l.written), 0);
}

/** 쓴 날이 있는 기록만 센다 — 평균 계산의 분모(안 쓴 날로 평균을 깎지 않는다). */
export function activeDays(logs: readonly WritingLog[]): number {
  return logs.filter((l) => l.written > 0).length;
}

export function averagePerActiveDay(logs: readonly WritingLog[]): number {
  const days = activeDays(logs);
  return days ? Math.round(totalWritten(logs) / days) : 0;
}

/** 가장 많이 쓴 날. 기록이 없으면 null. */
export function bestDay(logs: readonly WritingLog[]): DayPoint | null {
  let best: DayPoint | null = null;
  for (const l of logs) {
    if (l.written > 0 && (!best || l.written > best.written)) {
      best = { date: l.date, written: l.written };
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
