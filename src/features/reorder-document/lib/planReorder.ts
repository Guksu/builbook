import type { DocumentNode } from "@entities/document";

export type DropMode = "into" | "before";

// 드래그 결과를 실행 계획으로 변환하는 순수 함수.
// - move: 한 노드의 parentId/order 변경 (폴더 안으로 이동, 맨 끝에 append)
// - reorder: 형제 그룹을 orderedIds 순서로 0..n-1 재인덱싱
export type ReorderPlan =
  | { kind: "move"; id: string; parentId: string | null; order: number }
  | { kind: "reorder"; parentId: string | null; orderedIds: string[] }
  | null;

// node가 ancestorId의 자손인지(자기 자신 포함) — 평면 배열을 parentId로 거슬러 확인.
function isSelfOrDescendant(
  docs: DocumentNode[],
  ancestorId: string,
  nodeId: string,
): boolean {
  let cursor: string | null = nodeId;
  const guard = new Set<string>();
  while (cursor) {
    if (cursor === ancestorId) return true;
    if (guard.has(cursor)) break;
    guard.add(cursor);
    cursor = docs.find((d) => d.id === cursor)?.parentId ?? null;
  }
  return false;
}

export function planReorder(
  docs: DocumentNode[],
  dragId: string,
  targetId: string,
  mode: DropMode,
): ReorderPlan {
  if (dragId === targetId) return null;
  const drag = docs.find((d) => d.id === dragId);
  const target = docs.find((d) => d.id === targetId);
  if (!drag || !target) return null;

  if (mode === "into") {
    // 폴더 안으로 이동. 자기 자신/자손 폴더로는 이동 불가(순환).
    if (isSelfOrDescendant(docs, dragId, target.id)) return null;
    const childCount = docs.filter((d) => d.parentId === target.id).length;
    return { kind: "move", id: dragId, parentId: target.id, order: childCount };
  }

  // before: target과 같은 부모 그룹에서 target 바로 앞에 삽입.
  const parentId = target.parentId;
  // 부모가 drag의 자손이면(폴더를 자기 자손 옆으로) 순환 → 막음.
  if (parentId && isSelfOrDescendant(docs, dragId, parentId)) return null;
  const siblings = docs
    .filter((d) => d.parentId === parentId && d.id !== dragId)
    .sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((s) => s.id === targetId);
  const orderedIds = [
    ...siblings.slice(0, idx),
    drag,
    ...siblings.slice(idx),
  ].map((d) => d.id);
  return { kind: "reorder", parentId, orderedIds };
}
