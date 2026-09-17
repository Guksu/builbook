import type { Relation } from "../model/types";

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
