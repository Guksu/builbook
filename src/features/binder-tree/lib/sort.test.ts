import { describe, expect, it } from "vitest";
import { compareNodes, type SortableNode } from "./sort";

const n = (title: string, order: number, updatedAt: string): SortableNode => ({
  title,
  order,
  updatedAt,
});

describe("compareNodes", () => {
  const nodes = [
    n("히읗", 0, "2026-01-03T00:00:00.000Z"),
    n("가나", 1, "2026-01-01T00:00:00.000Z"),
    n("2화", 2, "2026-01-02T00:00:00.000Z"),
  ];

  it("order: 작가가 끌어 둔 순서를 그대로 쓴다", () => {
    const sorted = [...nodes].sort(compareNodes("order"));
    expect(sorted.map((x) => x.title)).toEqual(["히읗", "가나", "2화"]);
  });

  it("title: 한국어 정렬(localeCompare ko) — 숫자가 한글보다 앞", () => {
    const sorted = [...nodes].sort(compareNodes("title"));
    expect(sorted.map((x) => x.title)).toEqual(["2화", "가나", "히읗"]);
  });

  it("updated: 최근 수정이 위로", () => {
    const sorted = [...nodes].sort(compareNodes("updated"));
    expect(sorted.map((x) => x.title)).toEqual(["히읗", "2화", "가나"]);
  });

  it("동점이면 order로 되돌려 순서가 흔들리지 않는다", () => {
    const same = [
      n("같은 이름", 2, "2026-01-01T00:00:00.000Z"),
      n("같은 이름", 1, "2026-01-01T00:00:00.000Z"),
    ];
    expect([...same].sort(compareNodes("title")).map((x) => x.order)).toEqual([1, 2]);
    expect([...same].sort(compareNodes("updated")).map((x) => x.order)).toEqual([1, 2]);
  });
});
