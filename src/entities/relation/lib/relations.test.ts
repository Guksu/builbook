import { describe, it, expect } from "vitest";
import { countByNode, findRelationBetween, isValidRelationType, liveRelations } from "./relations";
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
