import { describe, it, expect } from "vitest";
import { estimateCostUsd, formatUsd, roughTokens, isAiModelChoice } from "./models";
import { looksLikeApiKey, maskApiKey } from "./keyStore";

describe("ai-client models", () => {
  it("비용은 단가 × 토큰 / 1M", () => {
    // opus: 입력 3000 × $5 + 출력 750 × $25 = 0.015 + 0.01875
    expect(estimateCostUsd(3000, "opus")).toBeCloseTo(0.03375, 5);
    expect(estimateCostUsd(3000, "sonnet")).toBeCloseTo(0.0135, 5);
  });
  it("표시는 센트 둘째 자리, 아주 작으면 '미만'", () => {
    expect(formatUsd(0.03375)).toBe("$0.03");
    expect(formatUsd(0.001)).toBe("$0.01 미만");
  });
  it("어림 토큰은 글자 수 / 1.5 올림", () => {
    expect(roughTokens(3000)).toBe(2000);
    expect(roughTokens(1)).toBe(1);
  });
  it("모델 선택 guard", () => {
    expect(isAiModelChoice("opus")).toBe(true);
    expect(isAiModelChoice("haiku")).toBe(false);
  });
});

describe("keyStore helpers", () => {
  it("키 형태 검사", () => {
    expect(looksLikeApiKey("sk-ant-api03-" + "a".repeat(40))).toBe(true);
    expect(looksLikeApiKey("hello")).toBe(false);
    expect(looksLikeApiKey("sk-ant-" + "a b".repeat(20))).toBe(false);
  });
  it("마스킹은 앞 7자·끝 4자만 남긴다", () => {
    expect(maskApiKey("sk-ant-api03-abcdefgh1234")).toBe("sk-ant-…1234");
    expect(maskApiKey("short")).toBe("•••••");
  });
});
