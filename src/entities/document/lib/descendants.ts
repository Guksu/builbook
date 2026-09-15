// 폴더 아래 본문 문서 모으기 — 스크리브닝(연속 보기)·폴더 합계 분량의 단일 출처.
// 스크리브너의 Scrivenings처럼 "폴더를 고르면 그 아래 원고가 한 장으로 이어져 보인다"를
// 만들려면, 어떤 문서가 어떤 순서로 이어지는지에 대한 규칙이 한 곳에만 있어야 한다.

import type { DocumentNode } from "../model/types";

/**
 * 폴더의 모든 자손 중 본문 문서(DOC)만 트리 순서(깊이우선 · order 오름차순)로 모은다.
 * - 하위 폴더 안의 문서도 포함한다(폴더 자체는 결과에서 빠진다).
 * - 휴지통 문서는 제외 — 삭제한 회차가 연속 보기에 다시 나타나면 안 된다.
 * - folderId가 없거나 폴더가 아니면 빈 배열.
 */
export function collectDescendantDocs(
  docs: readonly DocumentNode[],
  folderId: string,
): DocumentNode[] {
  const root = docs.find((d) => d.id === folderId);
  if (!root || root.type !== "FOLDER" || root.trashedAt) return [];

  // parentId → 자식들(order 오름차순). 한 번만 만들어 두고 재귀에서 재사용한다.
  const byParent = new Map<string, DocumentNode[]>();
  for (const d of docs) {
    if (d.trashedAt || d.parentId === null) continue;
    const arr = byParent.get(d.parentId) ?? [];
    arr.push(d);
    byParent.set(d.parentId, arr);
  }
  for (const arr of byParent.values()) arr.sort((a, b) => a.order - b.order);

  const out: DocumentNode[] = [];
  // 데이터가 깨져 부모-자식이 고리를 이뤄도 멈추도록 방문 기록을 남긴다.
  const seen = new Set<string>([folderId]);
  const visit = (parentId: string) => {
    for (const node of byParent.get(parentId) ?? []) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      if (node.type === "FOLDER") visit(node.id);
      else out.push(node);
    }
  };
  visit(folderId);
  return out;
}
