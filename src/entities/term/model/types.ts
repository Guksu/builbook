// Term(고유명사 사전 항목) 엔티티 모델 — 인물·지명·용어의 '정본 표기'를 등록해 둔다.
// 장편 연재에서 가장 흔한 사고가 표기 흔들림(테아르/테아리/테알)이라, 맞는 표기를 한 곳에
// 적어 두고 본문을 그 기준으로 훑는다.
export type TermCategory = "PERSON" | "PLACE" | "TERM";

export interface Term {
  id: string;
  projectId: string;
  category: TermCategory;
  /** 정본 표기. 예) "테아르". */
  name: string;
  /**
   * 일부러 쓰는 다른 표기들(별명·약칭·이명). 여기 있는 표기는 흔들림으로 잡지 않는다.
   * 예) 테아르의 별명 "검은 늑대".
   */
  aliases: string[];
  /** 메모(설정 요약 등, 선택). */
  note: string;
  createdAt: string;
  updatedAt: string;
}
