// Note(리서치 노트) 엔티티 모델 — 캐릭터·설정 메모.
// 2026-10부터 바인더 인물·설정 카드로 옮겨진다(features/notes-to-cards). 옛 기록·백업 호환을 위해 타입은 남긴다.
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
