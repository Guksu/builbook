import { describe, it, expect } from "vitest";
import {
  NODE_H,
  NODE_W,
  canvasSize,
  circleLayout,
  clampPosition,
  clipToRect,
  edgeGeometry,
  hitNode,
  nodeWidth,
  resolveLayout,
  toBoxes,
} from "./geometry";

describe("layout", () => {
  it("원형 배치는 인물 수만큼 서로 다른 자리를 준다", () => {
    const ids = ["a", "b", "c", "d"];
    const l = circleLayout(ids);
    expect(Object.keys(l)).toEqual(ids);
    const keys = new Set(ids.map((id) => `${l[id].x},${l[id].y}`));
    expect(keys.size).toBe(4);
  });
  it("저장된 좌표는 유지하고 없는 인물만 채우며, 지운 인물은 버린다", () => {
    const l = resolveLayout(["a", "b"], { a: { x: 10, y: 20 }, zombie: { x: 1, y: 1 } });
    expect(l.a).toEqual({ x: 10, y: 20 });
    expect(l.b).toBeDefined();
    expect(l.zombie).toBeUndefined();
  });
  it("망가진 좌표(NaN)는 자동 배치로 대체", () => {
    const l = resolveLayout(["a"], { a: { x: Number.NaN, y: 0 } });
    expect(Number.isFinite(l.a.x)).toBe(true);
  });
  it("캔버스는 최소 크기 이상이고 먼 노드를 포함한다", () => {
    expect(canvasSize({})).toEqual({ width: 720, height: 480 });
    const s = canvasSize({ a: { x: 1000, y: 900 } });
    expect(s.width).toBeGreaterThan(1000 + NODE_W);
    expect(s.height).toBeGreaterThan(900 + NODE_H);
  });
  it("좌표는 0 아래로 못 간다", () => {
    expect(clampPosition({ x: -5, y: 3.6 })).toEqual({ x: 0, y: 4 });
  });
  it("hitNode는 노드 네모 안의 점만 잡는다", () => {
    const l = { a: { x: 0, y: 0 }, b: { x: 300, y: 300 } };
    expect(hitNode(l, { x: 10, y: 10 })).toBe("a");
    expect(hitNode(l, { x: 300 + NODE_W, y: 300 })).toBe("b");
    expect(hitNode(l, { x: 200, y: 200 })).toBeNull();
  });
});

describe("edges", () => {
  it("선 끝은 노드 테두리 바깥에서 시작한다", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 400, y: 0 };
    const e = edgeGeometry(a, b);
    expect(e.x1).toBeGreaterThan(NODE_W);
    expect(e.x2).toBeLessThan(400);
    expect(e.y1).toBe(NODE_H / 2);
    expect(e.mid.x).toBeGreaterThan((e.x1 + e.x2) / 2); // 가운데에서 B쪽으로 살짝
    // 종류 라벨은 선에서 한쪽으로, 방향 라벨은 반대쪽으로 비켜 있다(겹침 방지).
    expect(e.mid.y).not.toBe(e.y1);
    expect(Math.sign(e.mid.y - e.y1)).toBe(-Math.sign(e.nearA.y - e.y1));
    expect(e.nearA.x).toBeGreaterThan(e.x1);
    expect(e.nearB.x).toBeLessThan(e.x2);
  });
  it("마주 보는 두 선의 종류 라벨은 같은 중심을 지나도 겹치지 않는다", () => {
    const h = edgeGeometry({ x: 0, y: 200 }, { x: 400, y: 200 }); // 가로선
    const v = edgeGeometry({ x: 200, y: 0 }, { x: 200, y: 400 }); // 세로선(중심 동일)
    const dist = Math.hypot(h.mid.x - v.mid.x, h.mid.y - v.mid.y);
    expect(dist).toBeGreaterThan(30);
  });
  it("같은 점이면 그대로", () => {
    expect(clipToRect({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
  });
});

describe("node width", () => {
  it("이름이 길수록 넓고, 최소·최대가 있다", () => {
    expect(nodeWidth("루나")).toBe(112);
    expect(nodeWidth("기사단장 로렌스")).toBe(8 * 14 + 48);
    expect(nodeWidth("아주아주아주아주아주아주아주 긴 이름")).toBe(240);
  });
  it("toBoxes는 좌표에 폭·높이를 붙이고, 선은 넓은 노드의 테두리에서 시작한다", () => {
    const boxes = toBoxes({ a: { x: 0, y: 0 }, b: { x: 400, y: 0 } }, (id) => (id === "a" ? "기사단장 로렌스" : "루나"));
    expect(boxes.a.w).toBe(160);
    const e = edgeGeometry(boxes.a, boxes.b);
    expect(e.x1).toBeCloseTo(160 + 4);
    expect(hitNode(boxes, { x: 150, y: 10 })).toBe("a");
    expect(hitNode({ a: { x: 0, y: 0 } }, { x: 150, y: 10 })).toBeNull(); // 기본 폭 128
  });
});
