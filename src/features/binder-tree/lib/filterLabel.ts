// 바인더 라벨 필터 — "시점: 주인공"만 모아 보기처럼, 한 라벨의 회차만 남기는 순수 로직.
//
// 규칙 두 가지만 기억하면 된다.
// 1) 라벨이 붙는 건 회차(문서)다. 폴더는 스스로 걸리지 않고, 걸린 문서의 '길'로만 남는다.
//    (폴더까지 매칭시키면 "라벨 없음" 필터에서 모든 폴더가 걸려 필터가 무의미해진다.)
// 2) 남은 문서의 조상 폴더는 전부 유지한다 — 트리의 뿌리가 끊기면 그 문서가 화면에서 사라진다.

import type { DocumentNode } from "@entities/document";

/** 라벨 id · "none"(라벨 없는 문서만) · null(필터 끔). */
export type BinderLabelFilter = string | "none" | null;

export function filterTreeByLabel(
  docs: readonly DocumentNode[],
  filter: BinderLabelFilter,
): DocumentNode[] {
  if (!filter) return [...docs];

  const matched = docs.filter(
    (d) =>
      d.type === "DOC" && (filter === "none" ? !d.label : d.label === filter),
  );
  if (matched.length === 0) return [];

  const byId = new Map(docs.map((d) => [d.id, d] as const));
  const keep = new Set<string>();
  for (const doc of matched) {
    keep.add(doc.id);
    let cursor = doc.parentId;
    // 조상 폴더를 뿌리까지 따라 올라가며 살린다(이미 살린 조상을 만나면 멈춘다).
    while (cursor && !keep.has(cursor)) {
      keep.add(cursor);
      cursor = byId.get(cursor)?.parentId ?? null;
    }
  }
  return docs.filter((d) => keep.has(d.id));
}
