import { describe, expect, it } from "vitest";
import type { DocumentNode } from "@entities/document";
import {
  buildDocx,
  documentToSections,
  packDocxBuffer,
  projectToSections,
  toDocxParagraphs,
} from "./docx";

const text = (...lines: string[]) => ({
  type: "doc",
  content: lines.map((t) => ({ type: "paragraph", content: t ? [{ type: "text", text: t }] : [] })),
});
const node = (over: Partial<DocumentNode>): DocumentNode => ({
  id: "d",
  projectId: "p",
  parentId: null,
  type: "DOC",
  title: "1화",
  order: 0,
  content: text("첫 문장.", "", "둘째 문장."),
  synopsis: null,
  wordCount: 0,
  createdAt: "t",
  updatedAt: "t",
  ...over,
});

describe("toDocxParagraphs", () => {
  it("빈 문단은 버리고 앞뒤 공백을 다듬는다", () => {
    expect(toDocxParagraphs(text("  가 ", "", "나"))).toEqual(["가", "나"]);
    expect(toDocxParagraphs(null)).toEqual([]);
  });
});

describe("sections", () => {
  it("단일 문서는 1단계 제목 하나", () => {
    expect(documentToSections(node({}))).toEqual([
      { level: 1, title: "1화", paragraphs: ["첫 문장.", "둘째 문장."] },
    ]);
  });
  it("작품 전체는 작품 제목 + 트리 순서, 휴지통 제외, 폴더는 본문 없음", () => {
    const secs = projectToSections("내 소설", [
      node({ id: "f", type: "FOLDER", title: "1부", content: null }),
      node({ id: "a", parentId: "f", title: "1화" }),
      node({ id: "b", title: "버림", order: 1, trashedAt: "2026-01-01T00:00:00.000Z" }),
    ]);
    expect(secs.map((s) => [s.level, s.title])).toEqual([
      [0, "내 소설"],
      [1, "1부"],
      [2, "1화"],
    ]);
    expect(secs[1].paragraphs).toEqual([]);
  });
});

describe("buildDocx", () => {
  it("유효한 docx(zip) 바이트를 만든다", async () => {
    const buf = await packDocxBuffer(buildDocx(projectToSections("내 소설", [node({})])));
    expect(buf.length).toBeGreaterThan(1000);
    // zip 로컬 파일 헤더 시그니처 "PK\x03\x04"
    expect([buf[0], buf[1], buf[2], buf[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });
});
