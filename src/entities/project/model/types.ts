// Project 엔티티 모델 (로컬 우선 · IndexedDB 저장). 로그인 없음 → owner 개념 없음.
export interface Project {
  id: string;
  title: string;
  description: string | null;
  // 작품 단위 목표 단어 수(선택). 미설정 시 undefined — 기존 레코드 호환.
  goal?: number;
  createdAt: string;
  updatedAt: string;
}
