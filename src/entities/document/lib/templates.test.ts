import { describe, expect, it } from "vitest";
import { extractPlainText } from "@shared/lib";
import {
  DOCUMENT_KINDS,
  buildTemplateContent,
  defaultTitleForKind,
  isManuscript,
  kindLabel,
} from "./templates";

describe("templates", () => {
  it("종류 셋에 라벨이 있다", () => {
    expect(DOCUMENT_KINDS.map((k) => k.value)).toEqual(["episode", "character", "setting"]);
    expect(kindLabel("character")).toBe("인물 카드");
  });
  it("회차는 빈 문단 하나", () => {
    expect(buildTemplateContent("episode")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
  it("인물 카드는 제목 6개, 설정 카드는 제목 5개", () => {
    const c = extractPlainText(buildTemplateContent("character"));
    expect(c).toContain("이름");
    expect(c).toContain("관계");
    const s = extractPlainText(buildTemplateContent("setting"));
    expect(s).toContain("규칙·제약");
    expect(s).toContain("등장 회차");
    const headings = (buildTemplateContent("character") as { content: { type: string }[] }).content.filter(
      (n) => n.type === "heading",
    );
    expect(headings).toHaveLength(6);
  });
  it("kind가 없거나 episode면 원고", () => {
    expect(isManuscript({})).toBe(true);
    expect(isManuscript({ kind: "episode" })).toBe(true);
    expect(isManuscript({ kind: "character" })).toBe(false);
  });
  it("기본 제목: 회차는 다음 번호, 카드는 겹치지 않게", () => {
    expect(defaultTitleForKind("episode", [{ title: "3화" }])).toBe("4화");
    expect(defaultTitleForKind("character", [])).toBe("새 인물");
    expect(defaultTitleForKind("character", [{ title: "새 인물" }])).toBe("새 인물 2");
    expect(defaultTitleForKind("setting", [{ title: "새 설정" }, { title: "새 설정 2" }])).toBe("새 설정 3");
  });
});
