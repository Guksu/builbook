"use client";

import { mutate } from "swr";
import { STORES, dbGet } from "@shared/db";
import { extractPlainText, measureText } from "@shared/lib";
import { saveDocumentContent, type DocumentNode } from "@entities/document";
import { createSnapshotRecord, snapshotsKey } from "@entities/snapshot";
import { replaceInContent } from "../lib/replaceAcross";

export interface ReplaceResult {
  docs: number;
  count: number;
}

/**
 * 작품 전체 바꾸기 실행부. 문서마다 DB에서 최신 본문을 다시 읽어 바꾸고, 바꾸기 전 본문을 스냅샷으로 남긴다.
 * 열린 에디터의 남은 저장은 호출하는 쪽이 먼저 끝내 둬야 한다(flushAllAutosaves).
 * 작가가 쓴 분량이 아니므로 집필 기록에는 넣지 않는다.
 */
export async function replaceAcrossProject(
  docIds: readonly string[],
  query: string,
  replacement: string,
): Promise<ReplaceResult> {
  let docs = 0;
  let count = 0;
  for (const id of docIds) {
    const doc = await dbGet<DocumentNode>(STORES.documents, id);
    if (!doc || doc.type !== "DOC" || doc.trashedAt) continue;
    const r = replaceInContent(doc.content, query, replacement);
    if (!r.count) continue;
    await createSnapshotRecord({
      documentId: doc.id,
      projectId: doc.projectId,
      title: doc.title,
      content: doc.content,
      wordCount: doc.wordCount,
      note: `전체 바꾸기 전 자동 저장 ('${query}' → '${replacement}')`,
    });
    await saveDocumentContent(doc.id, r.content, measureText(extractPlainText(r.content)), {
      recordWriting: false,
    });
    void mutate(snapshotsKey(doc.id));
    docs += 1;
    count += r.count;
  }
  return { docs, count };
}
