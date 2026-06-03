// Project 엔티티 모델 (로컬 우선 · IndexedDB 저장). 로그인 없음 → owner 개념 없음.
export interface Project {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
