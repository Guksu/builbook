import { describe, expect, it } from "vitest";
import { isDialogue, readerStats, toParagraphs } from "./readerText";

const doc = (...lines: string[]) => ({
  type: "doc",
  content: lines.map((text) => ({
    type: "paragraph",
    content: text ? [{ type: "text", text }] : [],
  })),
});

describe("toParagraphs", () => {
  it("문단 배열로 나눈다", () => {
    expect(toParagraphs(doc("첫 문단", "둘째 문단"))).toEqual(["첫 문단", "둘째 문단"]);
  });

  it("빈 문단은 버린다", () => {
    expect(toParagraphs(doc("본문", "", "  ", "다음"))).toEqual(["본문", "다음"]);
  });

  it("내용이 없으면 빈 배열", () => {
    expect(toParagraphs(null)).toEqual([]);
  });
});

describe("isDialogue", () => {
  it("따옴표로 시작하면 대사", () => {
    expect(isDialogue('"돌아왔군."')).toBe(true);
    expect(isDialogue("“정말?”")).toBe(true);
    expect(isDialogue("「그래.」")).toBe(true);
  });

  it("지문은 대사가 아니다", () => {
    expect(isDialogue("그는 검을 들었다.")).toBe(false);
  });

  it("앞 공백이 있어도 판정한다", () => {
    expect(isDialogue('   "안녕."')).toBe(true);
  });
});

describe("readerStats", () => {
  it("문단 수·글자 수·대사 비율을 낸다", () => {
    const stats = readerStats(doc('"살아 있었군."', "그는 웃었다.", '"그래."', "끝."));
    expect(stats.paragraphs).toBe(4);
    expect(stats.dialogueRatio).toBe(50);
  });

  it("읽기 시간은 최소 1분(내용이 있으면)", () => {
    expect(readerStats(doc("짧음")).minutes).toBe(1);
  });

  it("긴 글은 600자당 1분으로 어림한다", () => {
    expect(readerStats(doc("가".repeat(1800))).minutes).toBe(3);
  });

  it("빈 문서는 전부 0", () => {
    expect(readerStats(null)).toMatchObject({
      paragraphs: 0,
      chars: 0,
      minutes: 0,
      dialogueRatio: 0,
    });
  });
});
