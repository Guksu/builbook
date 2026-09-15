// 바인더 다중 선택(스크리브너처럼 여러 항목을 한꺼번에 고르는) 순수 로직.
// UI 상태(Set)와 무관하게 "어떤 id들이 대상인가"만 계산해 둔다 — 삭제·이동이 같은 규칙을 쓴다.

import type { DocumentNode } from "@entities/document";

/**
 * 보이는 줄 순서(flattenVisible 결과의 id 배열)에서 두 지점 사이를 범위로 고른다.
 * Shift+클릭이 쓴다 — 화면에 보이는 순서가 기준이라 접힌 폴더 안쪽은 끼어들지 않는다.
 * 둘 중 하나라도 목록에 없으면 클릭한 쪽만 고른다(사라진 anchor 방어).
 */
export function selectRange(
  visibleIds: readonly string[],
  anchorId: string | null,
  targetId: string,
): string[] {
  const to = visibleIds.indexOf(targetId);
  if (to < 0) return [];
  const from = anchorId ? visibleIds.indexOf(anchorId) : -1;
  if (from < 0) return [targetId];
  const [start, end] = from <= to ? [from, to] : [to, from];
  return visibleIds.slice(start, end + 1);
}

/**
 * 조상과 자손이 함께 선택된 경우 자손을 뺀다.
 * 폴더를 옮기면 그 안의 문서는 따라오므로, 자손까지 따로 옮기면 폴더 밖으로 튀어나온다
 * (삭제도 마찬가지 — 서브트리 cascade라 자손을 또 지울 필요가 없다).
 * 입력 순서는 그대로 유지한다 — 여러 개를 옮길 때 그 순서로 배치되기 때문.
 */
export function dropDescendants(
  docs: readonly DocumentNode[],
  ids: readonly string[],
): string[] {
  const selected = new Set(ids);
  const parentOf = new Map(docs.map((d) => [d.id, d.parentId] as const));
  const hasSelectedAncestor = (id: string) => {
    const seen = new Set<string>([id]);
    let cursor = parentOf.get(id) ?? null;
    while (cursor) {
      if (selected.has(cursor)) return true;
      if (seen.has(cursor)) break; // 깨진 데이터(순환) 방어
      seen.add(cursor);
      cursor = parentOf.get(cursor) ?? null;
    }
    return false;
  };
  return ids.filter((id) => parentOf.has(id) && !hasSelectedAncestor(id));
}
