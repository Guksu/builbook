import { describe, expect, it } from "vitest";
import { nextEpisodeTitle, nextFolderTitle, parseEpisodeNo } from "./naming";

describe("parseEpisodeNo", () => {
  it("여러 표기에서 번호를 뽑는다", () => {
    expect(parseEpisodeNo("12화")).toBe(12);
    expect(parseEpisodeNo("12화 - 각성")).toBe(12);
    expect(parseEpisodeNo("제 3 화")).toBe(3);
    expect(parseEpisodeNo("  7화")).toBe(7);
  });
  it("회차 형식이 아니면 null", () => {
    expect(parseEpisodeNo("프롤로그")).toBeNull();
    expect(parseEpisodeNo("화요일")).toBeNull();
    expect(parseEpisodeNo("에필로그 1화 아님")).toBeNull();
  });
});

describe("nextEpisodeTitle", () => {
  it("없으면 1화", () => {
    expect(nextEpisodeTitle([])).toBe("1화");
    expect(nextEpisodeTitle([{ title: "프롤로그" }])).toBe("1화");
  });
  it("가장 큰 번호 다음", () => {
    expect(nextEpisodeTitle([{ title: "1화" }, { title: "3화 - 각성" }, { title: "2화" }])).toBe("4화");
  });
  it("폴더 제목은 무시한다", () => {
    expect(nextEpisodeTitle([{ title: "10화까지", type: "FOLDER" }, { title: "2화", type: "DOC" }])).toBe("3화");
  });
});

describe("nextFolderTitle", () => {
  it("겹치지 않게 번호를 붙인다", () => {
    expect(nextFolderTitle([])).toBe("새 폴더");
    expect(nextFolderTitle([{ title: "새 폴더", type: "FOLDER" }])).toBe("새 폴더 2");
    expect(
      nextFolderTitle([
        { title: "새 폴더", type: "FOLDER" },
        { title: "새 폴더 2", type: "FOLDER" },
      ]),
    ).toBe("새 폴더 3");
  });
  it("문서 제목은 겹침 판정에서 뺀다", () => {
    expect(nextFolderTitle([{ title: "새 폴더", type: "DOC" }])).toBe("새 폴더");
  });
});
