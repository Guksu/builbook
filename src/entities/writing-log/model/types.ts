// WritingLog(일별 집필 기록) 엔티티 모델 — 작품 × 날짜 하나당 레코드 하나.
// "오늘 얼마나 썼나 / 며칠 연속 썼나"를 보여주기 위한 최소 기록. 원고 자체가 아니라
// 원고의 변화량만 담는다(원고가 지워져도 기록은 남고, 기록이 지워져도 원고는 멀쩡하다).
export interface WritingLog {
  /** `${projectId}:${date}` — 같은 날 같은 작품이면 항상 같은 레코드로 합산된다. */
  id: string;
  projectId: string;
  /** 로컬 시간 기준 YYYY-MM-DD. */
  date: string;
  /** 그날의 순증감 합(지운 날은 음수일 수 있다). */
  net: number;
  /** 그날 새로 쓴 분량만 합(양의 변화만). 목표·연속 집필일 판정은 이 값을 쓴다. */
  written: number;
  updatedAt: string;
}
