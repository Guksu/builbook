import { describe, expect, it } from "vitest";
import { DEFAULT_FOCUS_SETTINGS, focusStyle, isFocusSettings } from "./settings";

describe("focus settings", () => {
  it("기본값은 유효하다", () => {
    expect(isFocusSettings(DEFAULT_FOCUS_SETTINGS)).toBe(true);
  });
  it("잘못된 값은 거른다", () => {
    expect(isFocusSettings(null)).toBe(false);
    expect(isFocusSettings({ ...DEFAULT_FOCUS_SETTINGS, fontSize: "huge" })).toBe(false);
    expect(isFocusSettings({ ...DEFAULT_FOCUS_SETTINGS, typewriter: "yes" })).toBe(false);
  });
  it("스타일 값으로 바꾼다", () => {
    expect(focusStyle({ ...DEFAULT_FOCUS_SETTINGS, fontSize: "xl", width: "wide", lineHeight: "loose" })).toEqual({
      fontSize: "22px",
      lineHeight: 2.1,
      maxWidth: "900px",
    });
  });
});
