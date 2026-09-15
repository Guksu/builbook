import { describe, it, expect } from "vitest";
import {
  findMatches,
  findMatchesInChunks,
  stepMatchIndex,
  planReplaceAll,
  replaceAllInText,
  type TextChunk,
} from "./findMatches";

describe("findMatches", () => {
  it("빈 검색어는 빈 배열", () => {
    expect(findMatches("아무 문장", "")).toEqual([]);
  });

  it("나오는 자리를 모두 [start, end)로 준다", () => {
    expect(findMatches("테아르는 테아르를 봤다", "테아르")).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 8 },
    ]);
  });

  it("기본은 대소문자를 가리지 않는다", () => {
    expect(findMatches("Kael과 kael", "KAEL")).toHaveLength(2);
  });

  it("caseSensitive면 정확히 일치하는 것만", () => {
    expect(findMatches("Kael과 kael", "kael", { caseSensitive: true })).toEqual([
      { start: 6, end: 10 },
    ]);
  });

  it("겹치는 일치는 세지 않는다", () => {
    expect(findMatches("aaaa", "aa")).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });

  it("특수문자를 정규식이 아니라 글자 그대로 찾는다", () => {
    expect(findMatches("가격은 1.5(원)", "1.5(원)")).toEqual([{ start: 4, end: 10 }]);
    expect(findMatches("가격은 1x5", "1.5")).toEqual([]);
  });
});

describe("findMatchesInChunks", () => {
  const chunks: TextChunk[] = [
    { text: "테아르가 걸었다", from: 1 },
    { text: "그리고 테아르는 멈췄다", from: 12 },
  ];

  it("조각 시작 좌표를 더해 문서 좌표로 바꾼다", () => {
    expect(findMatchesInChunks(chunks, "테아르")).toEqual([
      { from: 1, to: 4 },
      { from: 16, to: 19 },
    ]);
  });

  it("문단을 넘는 일치는 찾지 않는다", () => {
    expect(findMatchesInChunks(chunks, "걸었다그리고")).toEqual([]);
  });

  it("문서 순서(앞→뒤)를 유지한다", () => {
    const found = findMatchesInChunks(chunks, "다");
    expect(found.map((m) => m.from)).toEqual([...found.map((m) => m.from)].sort((a, b) => a - b));
  });
});

describe("stepMatchIndex", () => {
  it("일치가 없으면 -1", () => {
    expect(stepMatchIndex(0, -1, 1)).toBe(-1);
  });

  it("다음으로 가고 끝에서 처음으로 돈다", () => {
    expect(stepMatchIndex(3, 0, 1)).toBe(1);
    expect(stepMatchIndex(3, 2, 1)).toBe(0);
  });

  it("이전으로 가고 처음에서 끝으로 돈다", () => {
    expect(stepMatchIndex(3, 1, -1)).toBe(0);
    expect(stepMatchIndex(3, 0, -1)).toBe(2);
  });

  it("아직 아무것도 고르지 않았으면(-1) 첫 일치 기준으로 움직인다", () => {
    expect(stepMatchIndex(3, -1, 1)).toBe(1);
  });
});

describe("planReplaceAll", () => {
  it("뒤에서부터 바꾸도록 내림차순 정렬한다(앞 좌표가 밀리지 않게)", () => {
    const plan = planReplaceAll([
      { from: 1, to: 4 },
      { from: 16, to: 19 },
      { from: 8, to: 11 },
    ]);
    expect(plan.map((m) => m.from)).toEqual([16, 8, 1]);
  });

  it("원본 배열을 건드리지 않는다", () => {
    const input = [{ from: 1, to: 2 }, { from: 5, to: 6 }];
    planReplaceAll(input);
    expect(input.map((m) => m.from)).toEqual([1, 5]);
  });
});

describe("replaceAllInText", () => {
  it("모든 일치를 바꾼다", () => {
    expect(replaceAllInText("테아르는 테아르다", "테아르", "카엘")).toBe("카엘는 카엘다");
  });

  it("빈 문자열로 바꾸면 지운다", () => {
    expect(replaceAllInText("아, 그, 아", "아", "")).toBe(", 그, ");
  });

  it("일치가 없으면 원본 그대로", () => {
    expect(replaceAllInText("원문", "없음", "x")).toBe("원문");
  });

  it("바꾼 결과가 다시 검색어를 만들어도 무한히 돌지 않는다", () => {
    expect(replaceAllInText("aa", "a", "aa")).toBe("aaaa");
  });
});
