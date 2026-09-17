import { describe, it, expect } from "vitest";
import { pngFileName, toGrayscale } from "./exportPng";

describe("pngFileName", () => {
  it("작품 제목과 날짜로, 금지 문자는 뺀다", () => {
    expect(pngFileName("회귀한 검사", new Date("2026-09-17T03:00:00Z"))).toBe("회귀한 검사-관계도-2026-09-17.png");
    expect(pngFileName('a/b:c*?"<>|', new Date("2026-01-01T00:00:00Z"))).toBe("abc-관계도-2026-01-01.png");
    expect(pngFileName("   ", new Date("2026-01-01T00:00:00Z"))).toBe("작품-관계도-2026-01-01.png");
    expect(pngFileName("회귀", new Date("2026-01-01T00:00:00Z"), true)).toBe("회귀-관계도-흑백-2026-01-01.png");
  });
});

describe("toGrayscale", () => {
  it("색 픽셀을 밝기값 하나로 바꾸고 알파는 둔다", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 128]);
    toGrayscale(data);
    expect([data[0], data[1], data[2], data[3]]).toEqual([76, 76, 76, 255]);
    expect([data[4], data[5], data[6], data[7]]).toEqual([29, 29, 29, 128]);
  });
});
