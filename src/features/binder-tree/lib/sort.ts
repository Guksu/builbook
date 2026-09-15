// 바인더 정렬 규칙 — UI/DB 비종속 순수 함수.
// 옵시디언처럼 "파일 탐색기 정렬" 한 군데서만 순서를 정하고, 평탄화(flatten)는 이 비교자를 받아 쓴다.

/** 바인더 순서(직접 배치) · 이름순 · 수정순(최근 먼저). 기본은 작가가 끌어 둔 순서다. */
export type BinderSort = "order" | "title" | "updated";

export const BINDER_SORTS: readonly BinderSort[] = ["order", "title", "updated"];

export const BINDER_SORT_LABEL: Record<BinderSort, string> = {
  order: "바인더 순서",
  title: "이름순",
  updated: "수정순",
};

/** 비교에 필요한 최소 필드만 요구한다 — DocumentNode 전체에 묶이지 않게. */
export interface SortableNode {
  title: string;
  order: number;
  updatedAt: string;
}

/**
 * 정렬 기준별 비교자. 동점이면 항상 `order`로 되돌려 안정적인 순서를 보장한다
 * (같은 이름/같은 수정시각이 흔한 회차 목록에서 렌더마다 순서가 흔들리지 않도록).
 */
export function compareNodes(
  mode: BinderSort,
): (a: SortableNode, b: SortableNode) => number {
  if (mode === "title") {
    return (a, b) =>
      a.title.localeCompare(b.title, "ko") || a.order - b.order;
  }
  if (mode === "updated") {
    // 최근 수정이 위로(내림차순).
    return (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.order - b.order;
  }
  return (a, b) => a.order - b.order;
}
