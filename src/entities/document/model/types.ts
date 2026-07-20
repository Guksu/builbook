// Document(바인더 노드) 엔티티 모델. API 계약(_workspace/03)과 1:1 일치.
export type DocType = "FOLDER" | "DOC";

export interface DocumentNode {
  id: string;
  projectId: string;
  parentId: string | null;
  type: DocType;
  title: string;
  order: number;
  content: unknown | null;
  synopsis: string | null;
  wordCount: number;
  // 문서 단위 목표 단어 수(선택). 미설정 시 undefined — 기존 레코드 호환.
  goal?: number;
  // 소프트 삭제 시각(ISO). 있으면 '휴지통' 상태 — 바인더·검색·목표 합계에서 제외.
  // 미설정(undefined)이면 정상 문서 — 기존 레코드는 필드가 없으므로 자동으로 정상 처리된다.
  trashedAt?: string;
  createdAt: string;
  updatedAt: string;
}
