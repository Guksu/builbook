import type { Relation, RelationChange } from "../model/types";

/** 프리셋 종류 — 목록에서 고르거나 직접 쓴다. */
export const RELATION_TYPES: readonly string[] = ["가족", "연인", "적", "동료", "스승", "라이벌", "기타"];

export function isValidRelationType(type: string): boolean {
  return type.trim().length > 0 && type.trim().length <= 20;
}

/** 두 인물 사이의 관계(방향 무관)를 찾는다. */
export function findRelationBetween(
  relations: readonly Relation[],
  a: string,
  b: string,
): Relation | undefined {
  return relations.find(
    (r) => (r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a),
  );
}

/** 양 끝 인물이 모두 살아 있는 관계만 — 인물 카드를 지운 뒤 남은 선은 그리지 않는다. */
export function liveRelations(relations: readonly Relation[], nodeIds: ReadonlySet<string>): Relation[] {
  return relations.filter((r) => nodeIds.has(r.fromId) && nodeIds.has(r.toId));
}

/** 특정 인물이 얽힌 관계 수 — 노드에 배지로. */
export function countByNode(relations: readonly Relation[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of relations) {
    out.set(r.fromId, (out.get(r.fromId) ?? 0) + 1);
    out.set(r.toId, (out.get(r.toId) ?? 0) + 1);
  }
  return out;
}

/** 관계 종류별 색 키 — 값은 라벨 색 이름과 같아 화면이 같은 토큰(--label-*)을 쓴다. 직접 입력한 종류는 gray. */
export const RELATION_TYPE_COLOR: Record<string, string> = {
  가족: "green",
  연인: "pink",
  적: "red",
  동료: "blue",
  스승: "purple",
  라이벌: "orange",
  기타: "gray",
};

export function relationTypeColor(type: string): string {
  return RELATION_TYPE_COLOR[type] ?? "gray";
}

/** 빈 줄·없는 회차를 뺀 변화 목록(저장 전 정리). */
export function cleanChanges(changes: readonly RelationChange[] | undefined): RelationChange[] {
  return (changes ?? [])
    .map((c) => ({ documentId: c.documentId, note: c.note.trim() }))
    .filter((c) => c.documentId && c.note);
}

/**
 * 회차 순서(문서 id → 순번)에 따라 변화를 정렬한다. 순번이 없는(지워진) 회차의 변화는 뒤로.
 */
export function sortChanges<T extends RelationChange>(changes: readonly T[], orderOf: ReadonlyMap<string, number>): T[] {
  const rank = (c: T) => orderOf.get(c.documentId) ?? Number.MAX_SAFE_INTEGER;
  return [...changes].sort((a, b) => rank(a) - rank(b));
}

/**
 * 어떤 시점(회차)까지의 마지막 변화. pointDocId가 null이면 '최신' = 순번이 있는 변화 중 마지막.
 * 그 시점 이전에 변화가 없으면 null(기본 관계 그대로).
 */
export function changeAt(
  relation: Relation,
  orderOf: ReadonlyMap<string, number>,
  pointDocId: string | null,
): RelationChange | null {
  const known = (relation.changes ?? []).filter((c) => orderOf.has(c.documentId));
  if (known.length === 0) return null;
  const limit = pointDocId === null ? Number.MAX_SAFE_INTEGER : (orderOf.get(pointDocId) ?? -1);
  const sorted = sortChanges(known, orderOf).filter((c) => (orderOf.get(c.documentId) ?? 0) <= limit);
  return sorted.length ? sorted[sorted.length - 1] : null;
}
