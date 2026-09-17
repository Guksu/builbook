// Relation(인물 관계선) 엔티티 — 인물 카드 두 장 사이의 관계. 관계도에서 선 하나.
// 방향이 다른 두 줄(A→B, B→A)을 한 레코드에 두어 "짝사랑"처럼 비대칭인 관계를 적을 수 있다.
export interface Relation {
  id: string;
  projectId: string;
  /** 인물 카드 문서 id(A). */
  fromId: string;
  /** 인물 카드 문서 id(B). */
  toId: string;
  /** 관계 종류 — 프리셋 이름 또는 직접 쓴 말(예: "가족", "연인", "옛 스승"). */
  type: string;
  /** A가 B를 어떻게 보나 — 한 줄(선택). */
  fromLabel: string;
  /** B가 A를 어떻게 보나 — 한 줄(선택). */
  toLabel: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
