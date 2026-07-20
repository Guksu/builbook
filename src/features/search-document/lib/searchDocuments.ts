// 작품 내 문서 검색 — 순수 함수(UI/DB 비종속). 제목 + 본문(평문) 대상.
// 본문 평문 추출은 snapshot-document의 단일 출처(extractPlainText)를 재사용한다.

import type { DocumentNode } from "@entities/document";
import { extractPlainText } from "@features/snapshot-document";

export interface SearchMatch {
  doc: DocumentNode;
  // 어디서 매치됐는가 — 제목/본문. 둘 다면 "title"(제목 우선 노출).
  field: "title" | "body";
  // 결과 목록에 보여줄 매치 주변 미리보기(본문) 또는 제목.
  snippet: string;
}

const SNIPPET_PAD = 24; // 본문 매치 앞뒤로 보여줄 글자 수

// 매치 주변을 잘라 한 줄 스니펫으로. 개행은 공백으로, 잘린 쪽은 말줄임 표시.
// extractPlainText는 개행↔공백이 1:1 길이라 원문 인덱스를 그대로 쓸 수 있다.
function makeSnippet(body: string, at: number, queryLen: number): string {
  const start = Math.max(0, at - SNIPPET_PAD);
  const end = Math.min(body.length, at + queryLen + SNIPPET_PAD);
  const slice = body.slice(start, end).replace(/\n/g, " ").trim();
  const prefix = start > 0 ? "…" : "";
  const suffix = end < body.length ? "…" : "";
  return `${prefix}${slice}${suffix}`;
}

// 문서 목록 + 쿼리 → 매치 결과. 빈/공백 쿼리는 빈 배열.
// DOC 노드만 대상(결과 클릭 시 에디터에서 열 수 있어야 하므로). 휴지통 문서는 방어적으로 제외.
export function searchDocuments(
  docs: readonly DocumentNode[],
  query: string,
): SearchMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches: SearchMatch[] = [];
  for (const doc of docs) {
    if (doc.type !== "DOC" || doc.trashedAt) continue;

    const titleHit = doc.title.toLowerCase().includes(q);
    const body = extractPlainText(doc.content);
    const bodyIdx = body.toLowerCase().indexOf(q);

    if (titleHit) {
      matches.push({ doc, field: "title", snippet: doc.title });
    } else if (bodyIdx >= 0) {
      matches.push({
        doc,
        field: "body",
        snippet: makeSnippet(body, bodyIdx, q.length),
      });
    }
  }
  return matches;
}
