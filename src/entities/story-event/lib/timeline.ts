// 연표 순서·표시 계산 — 순수 함수.

import type { StoryEvent } from "../model/types";

/** 연표 정렬: order 오름차순, 동률이면 생성 순(결정적 결과). */
export function sortEvents(events: readonly StoryEvent[]): StoryEvent[] {
  return [...events].sort(
    (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
  );
}

export function isValidEventTitle(title: string): boolean {
  return title.trim().length > 0;
}

/**
 * 한 칸 위/아래로 옮긴 뒤의 id 순서를 돌려준다(경계에서는 그대로).
 * 저장은 호출부가 이 순서대로 order를 0..n-1로 다시 매기는 방식 — 순서가 항상 촘촘하다.
 */
export function moveEvent(
  events: readonly StoryEvent[],
  id: string,
  direction: "up" | "down",
): string[] {
  const sorted = sortEvents(events);
  const ids = sorted.map((e) => e.id);
  const idx = ids.indexOf(id);
  if (idx < 0) return ids;
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= ids.length) return ids;
  [ids[idx], ids[target]] = [ids[target], ids[idx]];
  return ids;
}

export interface TimelineRow {
  event: StoryEvent;
  /** 연결된 회차 제목. 연결이 없거나 문서가 사라졌으면 null. */
  documentTitle: string | null;
  /** 연결이 걸려 있는데 문서를 찾을 수 없는 상태(삭제된 회차). */
  brokenLink: boolean;
}

/**
 * 연표 행 = 사건 + 연결 회차 제목. 문서가 사라진 연결은 끊어진 것으로 표시한다
 * (조용히 감추면 "분명 연결했는데" 하고 헤매게 된다).
 */
export function buildTimelineRows(
  events: readonly StoryEvent[],
  docs: readonly { id: string; title: string }[],
): TimelineRow[] {
  const titleById = new Map(docs.map((d) => [d.id, d.title] as const));
  return sortEvents(events).map((event) => {
    const title = event.documentId ? (titleById.get(event.documentId) ?? null) : null;
    return {
      event,
      documentTitle: title,
      brokenLink: !!event.documentId && title === null,
    };
  });
}
