// 집필 목표 진행률 계산 — 순수 함수(UI/DB 비종속이라 단위 테스트가 쉽다).
// 단위는 '단어 수'(DocumentNode.wordCount)로 통일한다 — 앱 전반이 단어 수를 노출하고,
// 세는 규칙은 @shared/lib의 countWords 단일 출처를 재사용한다(여기선 이미 센 값만 소비).

export interface GoalProgress {
  hasGoal: boolean; // 유효한 목표(양수)가 설정됐는가 — 미설정/0/음수는 false
  current: number; // 현재 값(단어 수)
  goal: number; // 목표 값(미설정이면 0)
  percent: number; // 정수 %, 표시용(초과 시 100 넘음)
  clampedPercent: number; // 0..100 정수 %, 진행률 바 너비용
  remaining: number; // 남은 양(목표-현재), 음수면 0
  reached: boolean; // 목표 달성(current >= goal, goal>0)
}

// 음수·NaN·비수치·소수를 0 이상 정수로 정규화(방어).
function normalizeCount(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

// 현재/목표 → 진행 상태. 목표 미설정(undefined)·0·음수는 "목표 없음"으로 처리한다.
export function computeProgress(current: unknown, goal: unknown): GoalProgress {
  const cur = normalizeCount(current);
  const g = normalizeCount(goal);
  if (g <= 0) {
    return {
      hasGoal: false,
      current: cur,
      goal: 0,
      percent: 0,
      clampedPercent: 0,
      remaining: 0,
      reached: false,
    };
  }
  const percent = Math.round((cur / g) * 100);
  return {
    hasGoal: true,
    current: cur,
    goal: g,
    percent,
    clampedPercent: Math.max(0, Math.min(100, percent)),
    remaining: Math.max(0, g - cur),
    reached: cur >= g,
  };
}

// 작품 전체 단어 수 합계 — DOC 노드의 wordCount 합(FOLDER는 집계 제외).
export function sumWordCounts(
  docs: readonly { type?: string; wordCount?: number }[],
): number {
  return docs.reduce(
    (sum, d) => sum + (d.type === "DOC" ? normalizeCount(d.wordCount) : 0),
    0,
  );
}
