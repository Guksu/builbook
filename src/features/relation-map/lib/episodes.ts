// 회차 순서 — 관계 변화의 "언제"는 바인더 순서(원고 회차)로 정한다.
import { flattenTree, isManuscript, type DocumentNode } from "@entities/document";

/** 바인더 순서의 원고 회차(폴더·인물/설정 카드 제외). */
export function episodeDocs(documents: readonly DocumentNode[]): DocumentNode[] {
  return flattenTree(documents)
    .map((f) => f.node)
    .filter((d) => d.type === "DOC" && isManuscript(d));
}

/** 회차 문서 id → 순번(0부터). */
export function episodeOrder(documents: readonly DocumentNode[]): Map<string, number> {
  return new Map(episodeDocs(documents).map((d, i) => [d.id, i]));
}
