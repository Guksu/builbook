import { describe, expect, it } from "vitest";
import { extractPlainText } from "@shared/lib";
import {
  cardIdForNote,
  noteKind,
  noteToCardContent,
  researchFolderId,
  sortNotesForCards,
} from "./noteToCard";

const note = (over: Partial<Parameters<typeof noteToCardContent>[0]> = {}) => ({
  category: "CHARACTER" as const,
  role: "주인공",
  body: "회귀한 검사.\n복수를 꿈꾼다.",
  ...over,
});

describe("noteToCardContent", () => {
  it("인물 노트는 역할과 설명을 제목 아래 문단으로 옮긴다", () => {
    expect(extractPlainText(noteToCardContent(note()))).toBe("역할\n주인공\n설명\n회귀한 검사.\n복수를 꿈꾼다.");
  });

  it("설정 노트는 역할이 있어도 설명만 옮긴다", () => {
    const text = extractPlainText(noteToCardContent(note({ category: "SETTING", role: "무시됨", body: "북방의 성채" })));
    expect(text).toBe("설명\n북방의 성채");
  });

  it("역할·설명이 모두 비면 빈 문단 하나", () => {
    const doc = noteToCardContent(note({ role: null, body: "  " })) as { content: unknown[] };
    expect(doc.content).toEqual([{ type: "paragraph" }]);
  });

  it("빈 줄은 빈 문단으로 남긴다(문단 사이 간격 보존)", () => {
    const doc = noteToCardContent(note({ role: null, body: "첫째\n\n둘째" })) as { content: unknown[] };
    expect(doc.content).toHaveLength(4); // 제목 + 첫째 + 빈 문단 + 둘째
  });
});

describe("id·종류·순서", () => {
  it("같은 노트·작품은 언제나 같은 id — 두 번 옮겨도 겹치지 않는다", () => {
    expect(cardIdForNote("n1")).toBe(cardIdForNote("n1"));
    expect(researchFolderId("p1")).not.toBe(researchFolderId("p2"));
  });

  it("CHARACTER → 인물 카드, SETTING → 설정 카드", () => {
    expect(noteKind({ category: "CHARACTER" })).toBe("character");
    expect(noteKind({ category: "SETTING" })).toBe("setting");
  });

  it("인물 먼저, 같은 종류는 만든 순서대로", () => {
    const sorted = sortNotesForCards([
      { category: "SETTING" as const, createdAt: "2026-01-01", title: "성채" },
      { category: "CHARACTER" as const, createdAt: "2026-03-01", title: "나중 인물" },
      { category: "CHARACTER" as const, createdAt: "2026-02-01", title: "먼저 인물" },
    ]);
    expect(sorted.map((n) => n.title)).toEqual(["먼저 인물", "나중 인물", "성채"]);
  });
});
