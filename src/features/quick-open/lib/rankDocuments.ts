// 빠른 열기 검색 — 제목만 본다(본문 검색은 검색 패널 몫). 순수 함수.
// 점수: 제목이 검색어로 시작 > 단어 시작에서 일치 > 아무 데나 포함. 같은 점수면 최근 수정 순.

import type { DocumentNode } from "@entities/document";

export interface QuickOpenHit {
  doc: DocumentNode;
  score: number;
}

const norm = (s: string) => s.trim().toLowerCase();

export function scoreTitle(title: string, query: string): number {
  const t = norm(title);
  const q = norm(query);
  if (!q) return 1; // 빈 검색어: 전부 같은 점수(최근 수정 순으로만 정렬)
  if (t.startsWith(q)) return 3;
  const idx = t.indexOf(q);
  if (idx < 0) return 0;
  const before = t[idx - 1];
  return before === undefined || /[\s\-_(\[·]/.test(before) ? 2 : 1;
}

export function rankDocuments(
  docs: readonly DocumentNode[],
  query: string,
  limit = 12,
): QuickOpenHit[] {
  const hits: QuickOpenHit[] = [];
  for (const doc of docs) {
    if (doc.trashedAt) continue;
    const score = scoreTitle(doc.title, query);
    if (score > 0) hits.push({ doc, score });
  }
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      // 같은 점수: 최근에 만진 문서가 위(스크리브너 Quick Search와 같은 감각)
      b.doc.updatedAt.localeCompare(a.doc.updatedAt) ||
      a.doc.title.localeCompare(b.doc.title, "ko"),
  );
  return hits.slice(0, limit);
}
