import { describe, it, expect } from "vitest";
import {
  changeAt,
  cleanChanges,
  countByNode,
  findRelationBetween,
  isValidRelationType,
  liveRelations,
  relationTypeColor,
  sortChanges,
} from "./relations";
import type { Relation } from "../model/types";

const rel = (id: string, fromId: string, toId: string): Relation => ({
  id, projectId: "p", fromId, toId, type: "동료", fromLabel: "", toLabel: "", note: "", createdAt: "", updatedAt: "",
});

describe("relations lib", () => {
  it("종류는 비어 있거나 20자를 넘으면 무효", () => {
    expect(isValidRelationType(" ")).toBe(false);
    expect(isValidRelationType("연인")).toBe(true);
    expect(isValidRelationType("가".repeat(21))).toBe(false);
  });
  it("두 인물 사이 관계는 방향과 무관하게 찾는다", () => {
    const rs = [rel("r1", "a", "b")];
    expect(findRelationBetween(rs, "b", "a")?.id).toBe("r1");
    expect(findRelationBetween(rs, "a", "c")).toBeUndefined();
  });
  it("지워진 인물이 얽힌 선은 그리지 않는다", () => {
    const rs = [rel("r1", "a", "b"), rel("r2", "a", "c")];
    expect(liveRelations(rs, new Set(["a", "b"])).map((r) => r.id)).toEqual(["r1"]);
  });
  it("노드별 관계 수", () => {
    const c = countByNode([rel("r1", "a", "b"), rel("r2", "a", "c")]);
    expect(c.get("a")).toBe(2);
    expect(c.get("c")).toBe(1);
  });
});

describe("relation changes", () => {
  const order = new Map([["ep1", 0], ["ep2", 1], ["ep3", 2]]);
  const r: Relation = {
    ...rel("r", "a", "b"),
    changes: [
      { documentId: "ep3", note: "화해" },
      { documentId: "ep1", note: "첫 만남" },
      { documentId: "gone", note: "지워진 회차" },
    ],
  };
  it("cleanChanges는 빈 줄과 회차 없는 항목을 뺀다", () => {
    expect(cleanChanges([{ documentId: "", note: "x" }, { documentId: "d", note: "  " }, { documentId: "d", note: " ok " }]))
      .toEqual([{ documentId: "d", note: "ok" }]);
  });
  it("회차 순서로 정렬하고 지워진 회차는 뒤로", () => {
    expect(sortChanges(r.changes!, order).map((c) => c.note)).toEqual(["첫 만남", "화해", "지워진 회차"]);
  });
  it("시점까지의 마지막 변화", () => {
    expect(changeAt(r, order, "ep1")?.note).toBe("첫 만남");
    expect(changeAt(r, order, "ep2")?.note).toBe("첫 만남");
    expect(changeAt(r, order, "ep3")?.note).toBe("화해");
    expect(changeAt(r, order, null)?.note).toBe("화해");
    expect(changeAt(rel("x", "a", "b"), order, null)).toBeNull();
  });
  it("종류별 색 — 직접 입력은 gray", () => {
    expect(relationTypeColor("연인")).toBe("pink");
    expect(relationTypeColor("옛 스승")).toBe("gray");
    expect(relationTypeColor("연인", { 연인: "purple" })).toBe("purple");
    expect(relationTypeColor("옛 스승", { "옛 스승": "blue" })).toBe("blue");
  });
});
