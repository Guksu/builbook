// 문서 트리를 "화면에 보이는 줄" 목록으로 평탄화한다.
// 접힌 폴더의 자식은 아예 빼기 때문에, 키보드 위/아래 이동은 이 배열의 인덱스 ±1이면 끝난다
// (렌더 결과와 키보드 순서가 어긋나는 사고를 구조적으로 막는다).

import type { DocumentNode } from "@entities/document";
import { compareNodes, type BinderSort } from "./sort";

export interface BinderRow {
  node: DocumentNode;
  /** 0부터 시작하는 들여쓰기 깊이 */
  depth: number;
  /** 폴더이면서 자식이 있는가(빈 폴더는 chevron을 비워 둔다) */
  hasChildren: boolean;
  /** 폴더가 펼쳐진 상태인가(문서는 항상 false) */
  expanded: boolean;
}

export function flattenVisible(
  docs: readonly DocumentNode[],
  collapsed: ReadonlySet<string>,
  mode: BinderSort = "order",
): BinderRow[] {
  const byParent = new Map<string | null, DocumentNode[]>();
  for (const d of docs) {
    const arr = byParent.get(d.parentId) ?? [];
    arr.push(d);
    byParent.set(d.parentId, arr);
  }
  const compare = compareNodes(mode);
  for (const arr of byParent.values()) arr.sort(compare);

  const rows: BinderRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const node of byParent.get(parentId) ?? []) {
      const isFolder = node.type === "FOLDER";
      const children = isFolder ? byParent.get(node.id) ?? [] : [];
      const expanded = isFolder && !collapsed.has(node.id);
      rows.push({ node, depth, hasChildren: children.length > 0, expanded });
      if (expanded) visit(node.id, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}

/** 작품 안의 모든 폴더 id — "모두 접기" 토글이 쓴다. */
export function collectFolderIds(docs: readonly DocumentNode[]): string[] {
  return docs.filter((d) => d.type === "FOLDER").map((d) => d.id);
}
