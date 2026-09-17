import { describe, it, expect } from "vitest";
import { pillSize, placeLabels, rectsOverlap, type LabelItem } from "./labels";

const item = (id: string, x: number, y: number, normal = { x: 0, y: 1 }): LabelItem => ({
  id, anchor: { x, y }, normal, w: 60, h: 20,
});

describe("labels", () => {
  it("rectsOverlap은 간격까지 본다", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 12, y: 0, w: 10, h: 10 })).toBe(true); // 간격 4 미만
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
  });
  it("겹치지 않으면 제자리", () => {
    const out = placeLabels([item("a", 0, 0), item("b", 200, 0)], []);
    expect(out.get("a")).toEqual({ x: 0, y: 0 });
    expect(out.get("b")).toEqual({ x: 200, y: 0 });
  });
  it("같은 자리의 두 라벨은 뒤 라벨이 법선 방향으로 밀린다", () => {
    const out = placeLabels([item("a", 100, 100), item("b", 100, 100)], []);
    expect(out.get("a")).toEqual({ x: 100, y: 100 });
    expect(out.get("b")!.y).toBe(124); // h 20 + 간격 4
  });
  it("노드(장애물) 위의 라벨은 비켜난다", () => {
    const out = placeLabels([item("a", 50, 50)], [{ x: 0, y: 0, w: 128, h: 44 }]);
    expect(out.get("a")!.y).toBeGreaterThan(50);
  });
  it("세 라벨이 한 점에 모여도 서로 다른 자리를 받는다", () => {
    const out = placeLabels([item("a", 0, 0), item("b", 0, 0), item("c", 0, 0)], []);
    const ys = new Set([out.get("a")!.y, out.get("b")!.y, out.get("c")!.y]);
    expect(ys.size).toBe(3);
  });
  it("pillSize는 12자를 넘으면 줄인다", () => {
    expect(pillSize("가나다").w).toBe(3 * 12 + 14);
    expect(pillSize("가나다라마바사아자차카타파하").text.endsWith("…")).toBe(true);
  });
});
