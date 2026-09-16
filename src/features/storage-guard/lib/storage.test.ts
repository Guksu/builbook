import { describe, expect, it } from "vitest";
import { formatBytes, summarizeStorage } from "./storage";

describe("formatBytes", () => {
  it("단위를 자동으로 고른다", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(20 * 1024 * 1024)).toBe("20 MB");
    expect(formatBytes(3.2 * 1024 ** 3)).toBe("3.2 GB");
  });
  it("이상한 값은 0 B로", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });
});

describe("summarizeStorage", () => {
  it("보호됨이면 경고 없음", () => {
    const s = summarizeStorage("persisted", { usage: 100, quota: 1000 });
    expect(s.warn).toBe(false);
    expect(s.usageText).toBe("100 B 사용 / 1000 B 가능");
  });
  it("미보호는 흔한 상태라 경고색 없이 안내만", () => {
    expect(summarizeStorage("not-persisted", null).warn).toBe(false);
    expect(summarizeStorage("not-persisted", null).usageText).toBeNull();
  });
  it("미지원이면 안내만", () => {
    const s = summarizeStorage("unsupported", null);
    expect(s.warn).toBe(false);
    expect(s.message).toContain("지원하지 않아요");
  });
  it("남은 공간 10% 미만이면 보호 여부와 상관없이 경고", () => {
    const s = summarizeStorage("persisted", { usage: 950, quota: 1000 });
    expect(s.nearlyFull).toBe(true);
    expect(s.warn).toBe(true);
  });
  it("quota 0이면 사용량 문구 없음", () => {
    expect(summarizeStorage("persisted", { usage: 0, quota: 0 }).usageText).toBeNull();
  });
});
