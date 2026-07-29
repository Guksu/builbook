import { describe, expect, it } from "vitest";
import { analyzeTerms, editDistance, isCorrectUse, tokenize, toScanDocs } from "./variants";
import type { Term } from "@entities/term";

const term = (over: Partial<Term> & { id: string; name: string }): Term => ({
  projectId: "p1",
  category: "PERSON",
  aliases: [],
  note: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const doc = (title: string, text: string) => ({ id: title, title, text });

describe("tokenize", () => {
  it("문장부호를 경계로 낱말을 뽑는다", () => {
    expect(tokenize('"테아르가, 웃었다."')).toEqual(["테아르가", "웃었다"]);
  });

  it("영문·숫자도 잡는다", () => {
    expect(tokenize("Level 99 각성")).toEqual(["Level", "99", "각성"]);
  });

  it("빈 문자열은 빈 배열", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("editDistance", () => {
  it("같으면 0", () => {
    expect(editDistance("테아르", "테아르")).toBe(0);
  });

  it("한 글자 교체는 1", () => {
    expect(editDistance("테아르", "테아리")).toBe(1);
  });

  it("한 글자 삭제는 1", () => {
    expect(editDistance("테아르", "테르")).toBe(1);
  });

  it("한도를 넘으면 조기 종료값(max+1)을 돌려준다", () => {
    expect(editDistance("테아르", "완전히다른말", 2)).toBeGreaterThan(2);
  });
});

describe("isCorrectUse", () => {
  it("조사가 붙어도 맞게 쓴 것으로 본다", () => {
    expect(isCorrectUse("테아르가", "테아르")).toBe(true);
    expect(isCorrectUse("테아르는", "테아르")).toBe(true);
  });

  it("표기가 다르면 아니다", () => {
    expect(isCorrectUse("테아리", "테아르")).toBe(false);
  });
});

describe("analyzeTerms", () => {
  const terms = [term({ id: "t1", name: "테아르" })];

  it("정본 표기 사용 횟수를 센다(조사 포함)", () => {
    const report = analyzeTerms(
      [doc("1화", "테아르가 걸었다. 테아르는 멈췄다.")],
      terms,
    );
    expect(report.usages[0]).toMatchObject({ term: "테아르", count: 2 });
    expect(report.variants).toHaveLength(0);
  });

  it("한 글자 다른 표기를 흔들림으로 잡는다", () => {
    const report = analyzeTerms([doc("1화", "테아리가 웃었다.")], terms);
    // 조사("가")는 떼고 흔들린 표기 자체로 보고한다
    expect(report.variants[0]).toMatchObject({
      term: "테아르",
      found: "테아리",
      count: 1,
    });
  });

  it("이명으로 등록한 표기는 잡지 않는다", () => {
    const withAlias = [term({ id: "t1", name: "테아르", aliases: ["테아리"] })];
    const report = analyzeTerms([doc("1화", "테아리가 웃었다.")], withAlias);
    expect(report.variants).toHaveLength(0);
    expect(report.usages[0].count).toBe(1);
  });

  it("다른 용어의 정본 표기는 흔들림이 아니다", () => {
    const two = [term({ id: "t1", name: "테아르" }), term({ id: "t2", name: "테아론" })];
    const report = analyzeTerms([doc("1화", "테아론이 왔다.")], two);
    expect(report.variants).toHaveLength(0);
  });

  it("같은 흔들림이 여러 번 나오면 합산하고 문서를 모은다", () => {
    const report = analyzeTerms(
      [doc("1화", "테아리가 왔다."), doc("2화", "테아리는 떠났다. 테아리도 울었다.")],
      terms,
    );
    expect(report.variants[0].count).toBe(3);
    expect(report.variants[0].documents).toEqual(["1화", "2화"]);
  });

  it("전혀 다른 낱말은 잡지 않는다", () => {
    const report = analyzeTerms([doc("1화", "고양이가 지나갔다.")], terms);
    expect(report.variants).toHaveLength(0);
  });

  it("사전이 비면 아무것도 보고하지 않는다", () => {
    const report = analyzeTerms([doc("1화", "아무 말이나.")], []);
    expect(report).toMatchObject({ usages: [], variants: [], scanned: 1 });
  });
});

describe("toScanDocs", () => {
  it("폴더는 빼고 본문만 평문으로 바꾼다", () => {
    const scan = toScanDocs([
      { id: "f1", title: "1부", type: "FOLDER", content: null },
      {
        id: "d1",
        title: "1화",
        type: "DOC",
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }],
        },
      },
    ]);
    expect(scan).toEqual([{ id: "d1", title: "1화", text: "본문" }]);
  });
});
