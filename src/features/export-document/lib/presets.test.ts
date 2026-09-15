import { describe, expect, it } from "vitest";
import { DEFAULT_COMPILE } from "./compile";
import { MAX_PRESETS, addPreset, removePreset, uniquePresetName } from "./presets";

describe("presets", () => {
  it("이름이 겹치면 번호를 붙이고 빈 이름은 '프리셋'", () => {
    const a = addPreset([], "플랫폼용", DEFAULT_COMPILE, "1");
    const b = addPreset(a, "플랫폼용", DEFAULT_COMPILE, "2");
    expect(b.map((p) => p.name)).toEqual(["플랫폼용", "플랫폼용 2"]);
    expect(uniquePresetName("  ", [])).toBe("프리셋");
  });
  it("옵션은 복사해 저장한다", () => {
    const opts = { ...DEFAULT_COMPILE, separator: "stars" as const };
    const [p] = addPreset([], "x", opts, "1");
    (opts as { separator: string }).separator = "none";
    expect(p.options.separator).toBe("stars");
  });
  it("최대 개수를 넘으면 오래된 것부터 버린다", () => {
    let list = addPreset([], "0", DEFAULT_COMPILE, "0");
    for (let i = 1; i <= MAX_PRESETS; i++) list = addPreset(list, String(i), DEFAULT_COMPILE, String(i));
    expect(list).toHaveLength(MAX_PRESETS);
    expect(list[0].name).toBe("1");
  });
  it("삭제", () => {
    const list = addPreset(addPreset([], "a", DEFAULT_COMPILE, "1"), "b", DEFAULT_COMPILE, "2");
    expect(removePreset(list, "1").map((p) => p.name)).toEqual(["b"]);
  });
});
