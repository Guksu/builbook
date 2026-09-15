// 마감일 페이스 — 남은 분량을 남은 날로 나눈 "하루에 이만큼" 계산(스크리브너 Project Targets의 핵심 숫자).
// 날짜는 로컬 YYYY-MM-DD 문자열로만 다룬다(시간대 때문에 하루가 밀리는 사고 방지).

export interface Pace {
  /** 오늘 포함 남은 날 수. 마감이 지났으면 0. */
  daysLeft: number;
  /** 하루에 써야 하는 양(올림). 남은 분량이 0이면 0, 마감이 지났으면 남은 분량 전부. */
  perDay: number;
  overdue: boolean;
}

function parseDay(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 두 날짜 키의 차(일). 같은 날이면 0. */
export function daysBetween(fromKey: string, toKey: string): number | null {
  const a = parseDay(fromKey);
  const b = parseDay(toKey);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function paceToDeadline(
  remaining: number,
  deadlineKey: string,
  todayKey: string,
): Pace | null {
  const diff = daysBetween(todayKey, deadlineKey);
  if (diff === null) return null;
  const left = Math.max(0, remaining);
  if (diff < 0) return { daysLeft: 0, perDay: left, overdue: true };
  const daysLeft = diff + 1; // 오늘도 쓰는 날로 센다
  return { daysLeft, perDay: left === 0 ? 0 : Math.ceil(left / daysLeft), overdue: false };
}
