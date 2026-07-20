import { describe, it, expect } from "vitest";
import { computeProgress, sumWordCounts } from "./progress";

describe("computeProgress", () => {
  it("목표 미설정(undefined)은 hasGoal=false", () => {
    const p = computeProgress(120, undefined);
    expect(p.hasGoal).toBe(false);
    expect(p.current).toBe(120);
    expect(p.percent).toBe(0);
    expect(p.clampedPercent).toBe(0);
  });

  it("목표 0은 '목표 없음'으로 처리(0 나눗셈 방지)", () => {
    const p = computeProgress(50, 0);
    expect(p.hasGoal).toBe(false);
    expect(p.percent).toBe(0);
  });

  it("음수 목표도 목표 없음으로 처리", () => {
    expect(computeProgress(50, -100).hasGoal).toBe(false);
  });

  it("일반 진행률을 정수 %로 반올림한다", () => {
    const p = computeProgress(500, 2000);
    expect(p.hasGoal).toBe(true);
    expect(p.percent).toBe(25);
    expect(p.clampedPercent).toBe(25);
    expect(p.remaining).toBe(1500);
    expect(p.reached).toBe(false);
  });

  it("반올림: 1/3 목표는 33%", () => {
    expect(computeProgress(1, 3).percent).toBe(33);
  });

  it("목표 초과 달성: percent는 100 넘고 clampedPercent는 100, reached=true", () => {
    const p = computeProgress(3000, 2000);
    expect(p.percent).toBe(150);
    expect(p.clampedPercent).toBe(100);
    expect(p.reached).toBe(true);
    expect(p.remaining).toBe(0);
  });

  it("정확히 목표 달성은 reached=true, remaining=0", () => {
    const p = computeProgress(2000, 2000);
    expect(p.percent).toBe(100);
    expect(p.reached).toBe(true);
    expect(p.remaining).toBe(0);
  });

  it("현재 0이면 0%", () => {
    const p = computeProgress(0, 1000);
    expect(p.percent).toBe(0);
    expect(p.remaining).toBe(1000);
    expect(p.reached).toBe(false);
  });

  it("비수치·음수·소수 현재값을 방어적으로 정규화한다", () => {
    expect(computeProgress(NaN, 100).current).toBe(0);
    expect(computeProgress(-5, 100).current).toBe(0);
    expect(computeProgress(12.9, 100).current).toBe(12);
    expect(computeProgress("x" as unknown, 100).current).toBe(0);
  });
});

describe("sumWordCounts", () => {
  it("DOC 노드의 wordCount만 합산한다", () => {
    const docs = [
      { type: "DOC", wordCount: 100 },
      { type: "DOC", wordCount: 250 },
      { type: "FOLDER", wordCount: 0 },
    ];
    expect(sumWordCounts(docs)).toBe(350);
  });

  it("FOLDER의 wordCount는 집계에서 제외한다", () => {
    const docs = [
      { type: "FOLDER", wordCount: 999 },
      { type: "DOC", wordCount: 10 },
    ];
    expect(sumWordCounts(docs)).toBe(10);
  });

  it("wordCount 누락·비수치는 0으로 취급한다", () => {
    const docs = [
      { type: "DOC" },
      { type: "DOC", wordCount: undefined },
      { type: "DOC", wordCount: 40 },
    ];
    expect(sumWordCounts(docs)).toBe(40);
  });

  it("빈 목록은 0", () => {
    expect(sumWordCounts([])).toBe(0);
  });
});
