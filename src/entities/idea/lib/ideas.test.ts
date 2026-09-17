import { describe, it, expect } from "vitest";
import { sortIdeas, isValidIdeaText, ideaKindLabel } from "./ideas";
import type { Idea } from "../model/types";

const idea = (id: string, createdAt: string): Idea => ({
  id,
  projectId: "p",
  kind: "note",
  text: id,
  createdAt,
  updatedAt: createdAt,
});

describe("ideas lib", () => {
  it("최신순으로 정렬하고 원본은 건드리지 않는다", () => {
    const src = [idea("a", "2026-01-01"), idea("b", "2026-03-01"), idea("c", "2026-02-01")];
    const out = sortIdeas(src);
    expect(out.map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(src.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
  it("공백뿐인 메모는 무효", () => {
    expect(isValidIdeaText("   ")).toBe(false);
    expect(isValidIdeaText(" 한 줄 ")).toBe(true);
  });
  it("종류 라벨", () => {
    expect(ideaKindLabel("ai")).toBe("AI");
    expect(ideaKindLabel("combo")).toBe("조합");
  });
});
