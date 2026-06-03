// API 계약(_workspace/03_api_contract.md)과 1:1 일치하는 프론트 타입.
export type DocType = "FOLDER" | "DOC";

export interface Project {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

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
