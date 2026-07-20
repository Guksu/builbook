// 문서 트리(바인더)에 대한 순수 함수들 — UI/DB 비종속이라 단위 테스트가 쉽다.
// 소프트 삭제(휴지통) 도입으로 "무엇이 정상 문서인가"의 단일 출처를 여기로 모은다.

import type { DocumentNode } from "../model/types";

// 한 노드의 모든 자손 id(자신 포함)를 수집 — cascade 소프트삭제/복원/영구삭제 공용.
// 어떤 문서 배열이 들어와도 동작(정상/휴지통 혼재 무관) — 호출부가 대상 목록을 고른다.
export function collectSubtreeIds(
  docs: readonly DocumentNode[],
  rootId: string,
): string[] {
  const ids = [rootId];
  const stack = [rootId];
  while (stack.length) {
    const parent = stack.pop()!;
    for (const d of docs) {
      if (d.parentId === parent) {
        ids.push(d.id);
        stack.push(d.id);
      }
    }
  }
  return ids;
}

// 정상(휴지통 아님) 문서만 — 바인더·검색·목표 합계 등 모든 소비처의 기본 목록.
export function selectActiveDocuments(
  docs: readonly DocumentNode[],
): DocumentNode[] {
  return docs.filter((d) => !d.trashedAt);
}

// 휴지통에 든 문서만.
export function selectTrashedDocuments(
  docs: readonly DocumentNode[],
): DocumentNode[] {
  return docs.filter((d) => !!d.trashedAt);
}

// 휴지통 목록에 표시할 '루트'만 — 부모가 휴지통에 없는 삭제 문서들.
// (폴더를 서브트리째 삭제하면 폴더만 루트로 보이고, 자손은 폴더 복원/영구삭제에 딸려 처리된다.
//  개별 삭제한 중첩 문서는 부모가 정상이므로 그 자체가 루트가 되어 노출된다.)
// 최신 삭제가 위로 오도록 trashedAt 내림차순 정렬.
export function selectTrashRoots(
  docs: readonly DocumentNode[],
): DocumentNode[] {
  const trashedIds = new Set(
    docs.filter((d) => d.trashedAt).map((d) => d.id),
  );
  return docs
    .filter((d) => d.trashedAt && (d.parentId === null || !trashedIds.has(d.parentId)))
    .sort((a, b) => (b.trashedAt ?? "").localeCompare(a.trashedAt ?? ""));
}

export interface FlatNode {
  node: DocumentNode;
  depth: number;
}

// 트리를 parentId·order 기준으로 깊이우선 평탄화 — 내보내기 순서/들여쓰기 계산용.
// 입력으로 받은 목록만 대상(휴지통 제외는 호출부가 selectActiveDocuments로 처리).
export function flattenTree(docs: readonly DocumentNode[]): FlatNode[] {
  const byParent = new Map<string | null, DocumentNode[]>();
  for (const d of docs) {
    const arr = byParent.get(d.parentId) ?? [];
    arr.push(d);
    byParent.set(d.parentId, arr);
  }
  for (const arr of byParent.values()) arr.sort((a, b) => a.order - b.order);

  const out: FlatNode[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const node of byParent.get(parentId) ?? []) {
      out.push({ node, depth });
      if (node.type === "FOLDER") visit(node.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}
