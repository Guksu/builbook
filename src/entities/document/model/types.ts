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
  createdAt: string;
  updatedAt: string;
}
