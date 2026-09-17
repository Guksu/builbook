// 선 위 라벨(알약)의 겹침 회피 — 순수 함수. 인물이 많아 선이 모이면 라벨끼리, 라벨과 노드가 겹친다.
// 각 라벨을 자기 선의 수직(법선) 방향으로 한 칸씩 밀어 빈자리를 찾는다(탐욕 배치).
import type { NodePosition } from "@entities/project";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LabelItem {
  id: string;
  /** 처음 자리(중심). */
  anchor: NodePosition;
  /** 밀어낼 방향(단위 벡터, 선의 법선). */
  normal: NodePosition;
  w: number;
  h: number;
}

const GAP = 4;
/** 후보 순서: 제자리, +1, -1, +2, -2, +3, -3 칸. */
const STEPS = [0, 1, -1, 2, -2, 3, -3];

export function rectsOverlap(a: Rect, b: Rect, gap = GAP): boolean {
  return !(a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y);
}

function rectAt(center: NodePosition, w: number, h: number): Rect {
  return { x: center.x - w / 2, y: center.y - h / 2, w, h };
}

/** 알약 크기 어림 — 글자 수 기준(측정 없이). 캔버스의 Pill과 같은 식이어야 한다. */
export function pillSize(text: string): { w: number; h: number; text: string } {
  const t = text.length > 12 ? `${text.slice(0, 11)}…` : text;
  return { w: t.length * 12 + 14, h: 20, text: t };
}

/**
 * 라벨 자리를 정한다. 먼저 온 라벨이 우선이고, 뒤 라벨은 앞 라벨·장애물(노드)을 피해 밀린다.
 * 어느 후보도 비어 있지 않으면 제자리에 둔다(안 보이는 것보다 겹치는 게 낫다).
 */
export function placeLabels(items: readonly LabelItem[], obstacles: readonly Rect[]): Map<string, NodePosition> {
  const placed: Rect[] = [];
  const out = new Map<string, NodePosition>();
  for (const item of items) {
    const step = item.h + GAP;
    let chosen: NodePosition = item.anchor;
    for (const k of STEPS) {
      const c = { x: item.anchor.x + item.normal.x * step * k, y: item.anchor.y + item.normal.y * step * k };
      const r = rectAt(c, item.w, item.h);
      const clash = obstacles.some((o) => rectsOverlap(r, o)) || placed.some((p) => rectsOverlap(r, p));
      if (!clash) {
        chosen = c;
        break;
      }
    }
    placed.push(rectAt(chosen, item.w, item.h));
    out.set(item.id, chosen);
  }
  return out;
}
