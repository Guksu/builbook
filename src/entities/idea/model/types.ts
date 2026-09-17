// Idea(영감 서랍 메모) 엔티티 — 뽑은 카드·조합·AI 답·직접 쓴 메모를 작품 단위로 모아 둔다.
// 원고(문서)와 분리된 '재료 상자'라 버려도 원고엔 영향이 없다.
export type IdeaKind = "card" | "combo" | "ai" | "note";

export interface Idea {
  id: string;
  projectId: string;
  kind: IdeaKind;
  /** 메모 본문(한 덩어리 텍스트). */
  text: string;
  /** 어디서 왔나 — 카드 태그·장르, AI 작업 이름 등 사람이 읽는 한 줄(선택). */
  source?: string;
  /** 메모를 붙인 회차(선택). 문서가 지워져도 메모는 남는다(링크만 끊김). */
  linkedDocumentId?: string;
  createdAt: string;
  updatedAt: string;
}
