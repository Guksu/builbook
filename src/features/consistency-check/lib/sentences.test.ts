import { describe, expect, it } from "vitest";
import {
  analyzeSentences,
  endingOf,
  findEndingRuns,
  findRepeatedWords,
  isDialogueLine,
  splitSentences,
} from "./sentences";

const doc = (...lines: string[]) => ({
  type: "doc",
  content: lines.map((text) => ({
    type: "paragraph",
    content: text ? [{ type: "text", text }] : [],
  })),
});

describe("splitSentences", () => {
  it("마침표·물음표·느낌표로 나눈다", () => {
    expect(splitSentences("갔다. 왔나? 그래!")).toEqual(["갔다.", "왔나?", "그래!"]);
  });

  it("개행도 문장 경계", () => {
    expect(splitSentences("한 줄\n다음 줄")).toEqual(["한 줄", "다음 줄"]);
  });

  it("빈 문자열은 빈 배열", () => {
    expect(splitSentences("   ")).toEqual([]);
  });
});

describe("endingOf", () => {
  it("종결부호를 떼고 끝 두 음절을 준다", () => {
    expect(endingOf("그는 돌아섰다.")).toBe("섰다");
  });

  it("따옴표로 끝나도 벗겨낸다", () => {
    expect(endingOf('"돌아섰다."')).toBe("섰다");
  });
});

describe("findEndingRuns", () => {
  it("같은 어미가 3회 이상 연달으면 잡는다", () => {
    const runs = findEndingRuns(["갔었다.", "봤었다.", "울었다.", "달렸다."]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ ending: "었다", count: 3, from: 1 });
  });

  it("2회까지는 잡지 않는다", () => {
    expect(findEndingRuns(["갔었다.", "봤었다.", "달렸다."])).toEqual([]);
  });

  it("마지막까지 이어진 반복도 놓치지 않는다", () => {
    const runs = findEndingRuns(["달렸다.", "갔었다.", "봤었다.", "울었다."]);
    expect(runs[0]).toMatchObject({ ending: "었다", count: 3, from: 2 });
  });
});

describe("findRepeatedWords", () => {
  it("기준 이상 반복된 낱말만 센다", () => {
    const text = "그림자 그림자 그림자 그림자 그림자 바람";
    expect(findRepeatedWords(text, 5)).toEqual([{ word: "그림", count: 5 }]);
  });

  it("반복이 없으면 빈 배열", () => {
    expect(findRepeatedWords("하나 둘 셋", 5)).toEqual([]);
  });
});

describe("isDialogueLine", () => {
  it("따옴표로 시작하면 대사", () => {
    expect(isDialogueLine('"돌아왔군."')).toBe(true);
    expect(isDialogueLine("그는 웃었다.")).toBe(false);
  });
});

describe("analyzeSentences", () => {
  it("문장 수·평균 길이·가장 긴 문장을 낸다", () => {
    const report = analyzeSentences(doc("짧다.", "이 문장은 조금 더 길게 이어진다."));
    expect(report.sentences).toBe(2);
    expect(report.averageChars).toBeGreaterThan(0);
    expect(report.longest?.text).toContain("조금 더");
  });

  it("긴 문장 개수를 센다", () => {
    const long = `${"가".repeat(80)}.`;
    expect(analyzeSentences(doc(long, "짧다.")).longCount).toBe(1);
  });

  it("대사 비율을 낸다", () => {
    const report = analyzeSentences(doc('"안녕."', "그는 답했다."));
    expect(report.dialogueRatio).toBe(50);
  });

  it("어미 반복을 보고한다", () => {
    const report = analyzeSentences(doc("갔었다.", "봤었다.", "울었다."));
    expect(report.endingRuns[0]).toMatchObject({ ending: "었다", count: 3 });
  });

  it("빈 문서는 전부 0", () => {
    expect(analyzeSentences(null)).toMatchObject({
      sentences: 0,
      averageChars: 0,
      longest: null,
      longCount: 0,
    });
  });
});
