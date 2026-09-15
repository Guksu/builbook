import { STORES, dbGetAllByProject, dbPut } from "@shared/db";
import type { DocumentNode } from "../model/types";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * 새 작품의 첫 문서("1화")를 만든다 — 빈 바인더 대신 바로 쓸 수 있는 칸을 준비한다.
 * 이미 문서가 있으면 아무것도 하지 않는다(중복 생성·재호출 방어).
 */
export async function seedFirstEpisode(projectId: string): Promise<DocumentNode | null> {
  const existing = await dbGetAllByProject<DocumentNode>(STORES.documents, projectId);
  if (existing.length > 0) return null;
  const ts = new Date().toISOString();
  const doc: DocumentNode = {
    id: crypto.randomUUID(),
    projectId,
    parentId: null,
    type: "DOC",
    title: "1화",
    order: 0,
    content: EMPTY_DOC,
    synopsis: null,
    wordCount: 0,
    charCount: 0,
    charCountNoSpace: 0,
    createdAt: ts,
    updatedAt: ts,
  };
  await dbPut(STORES.documents, doc);
  return doc;
}
