import { describe, it, expect } from "vitest";
import { buildCombo, canCombine, subjectParticle } from "./combo";

const rng = () => 0; // 항상 첫 항목

describe("combo", () => {
  it("인물이나 사건이 없으면 만들 수 없다", () => {
    expect(canCombine({ characters: [], settings: ["성"], events: ["e"] })).toBe(false);
    expect(canCombine({ characters: ["a"], settings: [], events: [] })).toBe(false);
    expect(buildCombo({ characters: [], settings: [], events: ["e"] }, rng)).toBeNull();
  });
  it("인물·설정·상대·사건을 한 문장으로 엮는다", () => {
    const combo = buildCombo(
      { characters: ["테아르", "루나"], settings: ["검은 탑"], events: ["비밀이 들통난다"] },
      rng,
    );
    expect(combo?.text).toBe("테아르가 검은 탑에서 루나와 함께 비밀이 들통난다.");
    expect(combo?.other).toBe("루나");
  });
  it("인물 한 명·설정 없음도 된다", () => {
    const combo = buildCombo({ characters: ["강산"], settings: [], events: ["떠난다"] }, rng);
    expect(combo?.text).toBe("강산이 떠난다.");
    expect(combo?.other).toBeNull();
    expect(combo?.setting).toBeNull();
  });
  it("이/가 조사는 받침으로 고른다", () => {
    expect(subjectParticle("강산")).toBe("이");
    expect(subjectParticle("루나")).toBe("가");
    expect(subjectParticle("Zed")).toBe("이(가)");
  });
});
