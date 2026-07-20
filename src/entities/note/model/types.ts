// Note(리서치 노트) 엔티티 모델 — 캐릭터·설정 카드.
// 바인더(문서 트리)와 분리된, 작품 단위의 참고 자료. 스크리브너 캐릭터/설정 시트의 단순화판.
export type NoteCategory = "CHARACTER" | "SETTING";

export interface Note {
  id: string;
  projectId: string;
  category: NoteCategory;
  /** 캐릭터면 이름, 설정이면 제목. */
  title: string;
  /** 캐릭터 역할(주인공·조연 등). 설정 노트에선 비워 둔다(null). */
  role: string | null;
  /** 자유 서술 — 캐릭터 설명 또는 설정 설명. */
  body: string;
  createdAt: string;
  updatedAt: string;
}
