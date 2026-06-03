// Project 엔티티 모델. API 계약(_workspace/03)과 1:1 일치.
export interface Project {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
