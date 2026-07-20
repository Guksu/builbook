import { describe, it, expect } from "vitest";
import {
  safeFileName,
  documentToPlainText,
  documentToMarkdown,
  projectToPlainText,
  projectToMarkdown,
} from "./exportDocuments";
import type { DocumentNode } from "@entities/document";

function para(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

function doc(partial: Partial<DocumentNode> & { id: string }): DocumentNode {
  return {
    projectId: "p1",
    parentId: null,
    type: "DOC",
    title: partial.id,
    order: 0,
    content: null,
    synopsis: null,
    wordCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("safeFileName", () => {
  it("파일명 금지문자를 제거한다", () => {
    expect(safeFileName('1화: 시작/끝?')).toBe("1화 시작끝");
  });
  it("비면 '무제'로 대체", () => {
    expect(safeFileName("   ")).toBe("무제");
    expect(safeFileName("///")).toBe("무제");
  });
});

describe("단일 문서 변환", () => {
  const d = doc({ id: "1", title: "프롤로그", content: para("어두운 밤이었다") });
  it("txt: 제목 + 본문", () => {
    expect(documentToPlainText(d)).toBe("프롤로그\n\n어두운 밤이었다\n");
  });
  it("md: h1 제목 + 본문", () => {
    expect(documentToMarkdown(d)).toBe("# 프롤로그\n\n어두운 밤이었다\n");
  });
  it("빈 본문은 제목만", () => {
    const empty = doc({ id: "e", title: "빈 문서", content: null });
    expect(documentToPlainText(empty)).toBe("빈 문서\n");
    expect(documentToMarkdown(empty)).toBe("# 빈 문서\n");
  });
});

describe("작품 전체 변환", () => {
  // F(폴더) > [a, b], c(루트) — 휴지통 t는 제외돼야
  const docs: DocumentNode[] = [
    doc({ id: "F", title: "1부", type: "FOLDER", parentId: null, order: 0 }),
    doc({ id: "a", title: "1화", parentId: "F", order: 0, content: para("첫 화") }),
    doc({ id: "b", title: "2화", parentId: "F", order: 1, content: para("둘째 화") }),
    doc({ id: "c", title: "후기", parentId: null, order: 1, content: para("끝") }),
    doc({
      id: "t",
      title: "삭제됨",
      parentId: null,
      order: 2,
      trashedAt: "2026-02-01T00:00:00.000Z",
      content: para("휴지통"),
    }),
  ];

  it("md: 작품 h1, 폴더 h2, 하위 문서 h3, 휴지통 제외", () => {
    const md = projectToMarkdown("내 소설", docs);
    expect(md).toBe(
      "# 내 소설\n\n" +
        "## 1부\n\n" +
        "### 1화\n\n첫 화\n\n" +
        "### 2화\n\n둘째 화\n\n" +
        "## 후기\n\n끝\n",
    );
  });

  it("txt: 제목·본문을 트리 순서로, 휴지통 제외", () => {
    const txt = projectToPlainText("내 소설", docs);
    expect(txt).toContain("내 소설");
    expect(txt).toContain("1화\n\n첫 화");
    expect(txt).not.toContain("삭제됨");
    expect(txt).not.toContain("휴지통");
  });
});
