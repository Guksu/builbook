import { describe, it, expect } from "vitest";
import { pngFileName } from "./exportPng";

describe("pngFileName", () => {
  it("작품 제목과 날짜로, 금지 문자는 뺀다", () => {
    expect(pngFileName("회귀한 검사", new Date("2026-09-17T03:00:00Z"))).toBe("회귀한 검사-관계도-2026-09-17.png");
    expect(pngFileName('a/b:c*?"<>|', new Date("2026-01-01T00:00:00Z"))).toBe("abc-관계도-2026-01-01.png");
    expect(pngFileName("   ", new Date("2026-01-01T00:00:00Z"))).toBe("작품-관계도-2026-01-01.png");
  });
});
