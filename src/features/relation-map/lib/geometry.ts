// 관계도 기하 — 노드 배치와 선 끝점 계산. 순수 함수라 화면 없이 검증한다.
import type { NodePosition } from "@entities/project";

export const NODE_W = 128;
export const NODE_H = 44;
export const CANVAS_MIN_W = 720;
export const CANVAS_MIN_H = 480;
const MARGIN = 80;

export type Layout = Record<string, NodePosition>;

/** 노드 상자 — 좌표에 폭·높이를 더한 것. 폭은 이름 길이에 따라 다르다(w·h를 빼면 기본 크기). */
export interface NodeBox extends NodePosition {
  w?: number;
  h?: number;
}
export type Boxes = Record<string, NodeBox>;

const NODE_MIN_W = 112;
const NODE_MAX_W = 240;
/** 한글 한 글자 ≈ 14px(body-sm). 좌우 여백 + 손잡이 자리 48px. */
export function nodeWidth(name: string): number {
  return Math.min(NODE_MAX_W, Math.max(NODE_MIN_W, name.trim().length * 14 + 48));
}

/** 배치(좌표) + 이름 → 상자. */
export function toBoxes(layout: Layout, nameOf: (id: string) => string): Boxes {
  const out: Boxes = {};
  for (const [id, pos] of Object.entries(layout)) out[id] = { ...pos, w: nodeWidth(nameOf(id)), h: NODE_H };
  return out;
}

const wOf = (b: NodeBox) => b.w ?? NODE_W;
const hOf = (b: NodeBox) => b.h ?? NODE_H;

/** 원형 자동 배치 — 인물 수에 따라 반지름을 늘려 노드가 겹치지 않게 한다. */
export function circleLayout(ids: readonly string[], center = { x: 380, y: 260 }): Layout {
  const n = ids.length;
  const out: Layout = {};
  if (n === 0) return out;
  if (n === 1) {
    out[ids[0]] = { x: center.x - NODE_W / 2, y: center.y - NODE_H / 2 };
    return out;
  }
  // 반지름은 인물 수에 비례하되 최소 190 — 6명 안팎일 때 가운데에 선·라벨이 몰리지 않게.
  const radius = Math.max(190, (n * (NODE_W + 56)) / (2 * Math.PI));
  ids.forEach((id, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    out[id] = {
      x: Math.round(center.x + radius * Math.cos(angle) - NODE_W / 2),
      y: Math.round(center.y + radius * Math.sin(angle) - NODE_H / 2),
    };
  });
  return out;
}

/**
 * 저장된 배치에 없는 인물은 원형 자리 중 빈 곳을 준다. 저장된 것은 그대로.
 * 결과에는 살아 있는 인물만 남는다(지운 인물의 좌표는 버린다).
 */
export function resolveLayout(ids: readonly string[], saved: Layout | undefined): Layout {
  const out: Layout = {};
  const fallback = circleLayout(ids);
  for (const id of ids) {
    const pos = saved?.[id];
    out[id] = pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) ? pos : fallback[id];
  }
  return out;
}

export function nodeCenter(box: NodeBox): NodePosition {
  return { x: box.x + wOf(box) / 2, y: box.y + hOf(box) / 2 };
}

/** 캔버스 크기 — 가장 멀리 있는 노드 + 여백. 최소 크기 보장. */
export function canvasSize(boxes: Boxes): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;
  for (const b of Object.values(boxes)) {
    maxX = Math.max(maxX, b.x + wOf(b));
    maxY = Math.max(maxY, b.y + hOf(b));
  }
  return { width: Math.max(CANVAS_MIN_W, maxX + MARGIN), height: Math.max(CANVAS_MIN_H, maxY + MARGIN) };
}

/** 좌표를 0 이상으로 — 노드를 화면 밖 왼쪽·위로 끌어낼 수 없게. */
export function clampPosition(pos: NodePosition): NodePosition {
  return { x: Math.max(0, Math.round(pos.x)), y: Math.max(0, Math.round(pos.y)) };
}

/** 점이 어느 노드 위에 있나(위에서부터 그린 순서와 무관하게 마지막 일치). */
export function hitNode(boxes: Boxes, point: NodePosition): string | null {
  let hit: string | null = null;
  for (const [id, b] of Object.entries(boxes)) {
    if (point.x >= b.x && point.x <= b.x + wOf(b) && point.y >= b.y && point.y <= b.y + hOf(b)) hit = id;
  }
  return hit;
}

export interface EdgeGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 종류 라벨 자리 — 선 가운데에서 한쪽(법선 방향)으로 살짝 비켜 있다.
   *  같은 점을 지나는 두 선(원형 배치의 마주 보는 쌍)이 겹치지 않게 하려는 것. */
  mid: NodePosition;
  /** A쪽 방향 라벨 자리 — A 끝에서 조금 들어온 지점, 종류 라벨과 반대쪽. */
  nearA: NodePosition;
  nearB: NodePosition;
  /** 시점 보기에서 "그 회차의 변화" 라벨 자리 — 종류 라벨 아래(같은 쪽으로 더 멀리). */
  changeSlot: NodePosition;
  /** 선의 법선(단위 벡터) — 라벨 겹침 회피가 이 방향으로 민다. */
  normal: NodePosition;
}

/** 종류 라벨을 선에서 띄우는 거리(px). */
const TYPE_OFFSET = 12;
/** 방향 라벨을 선 반대쪽으로 띄우는 거리(px) — 짧은 대각선에서도 종류 라벨과 안 겹치게 더 멀리. */
const DIR_OFFSET = 26;
/** 방향 라벨이 선 끝에서 들어오는 거리(px). 짧은 선에서는 길이의 35%. */
const END_INSET = 56;
/** 종류 라벨을 선 가운데에서 B쪽으로 미는 거리(px) — 한 점에서 교차하는 두 선의 종류 라벨이 겹치지 않게. */
const TYPE_ALONG = 24;

/** 두 노드 중심을 잇되, 선이 네모 안으로 들어가지 않게 테두리에서 자른다. */
export function edgeGeometry(a: NodeBox, b: NodeBox): EdgeGeometry {
  const ca = nodeCenter(a);
  const cb = nodeCenter(b);
  const p1 = clipToRect(ca, cb, wOf(a) / 2, hOf(a) / 2);
  const p2 = clipToRect(cb, ca, wOf(b) / 2, hOf(b) / 2);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const u = { x: dx / len, y: dy / len };
  const n = { x: -u.y, y: u.x };
  const inset = Math.min(END_INSET, len * 0.35);
  const at = (base: NodePosition, along: number, side: number) => ({
    x: base.x + u.x * along + n.x * side,
    y: base.y + u.y * along + n.y * side,
  });
  return {
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    mid: at(p1, len / 2 + Math.min(TYPE_ALONG, len * 0.15), TYPE_OFFSET),
    changeSlot: at(p1, len / 2 + Math.min(TYPE_ALONG, len * 0.15), TYPE_OFFSET + 24),
    normal: n,
    nearA: at(p1, inset, -DIR_OFFSET),
    nearB: at(p2, -inset, -DIR_OFFSET),
  };
}

/** center에서 target 방향으로 나가는 선이 노드 네모(center 기준 반폭 halfW·반높이 halfH)와 만나는 점. */
export function clipToRect(
  center: NodePosition,
  target: NodePosition,
  halfW = NODE_W / 2,
  halfH = NODE_H / 2,
): NodePosition {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  if (dx === 0 && dy === 0) return { ...center };
  const hw = halfW + 4;
  const hh = halfH + 4;
  const tx = dx === 0 ? Infinity : hw / Math.abs(dx);
  const ty = dy === 0 ? Infinity : hh / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: center.x + dx * t, y: center.y + dy * t };
}
