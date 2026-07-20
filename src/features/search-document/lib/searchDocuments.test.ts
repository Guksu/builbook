import { describe, it, expect } from "vitest";
import { searchDocuments } from "./searchDocuments";
import type { DocumentNode } from "@entities/document";

// ProseMirror 문단 헬퍼.
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

const docs: DocumentNode[] = [
  doc({ id: "1", title: "프롤로그", content: para("어두운 밤 이야기가 시작되었다") }),
  doc({ id: "2", title: "전투의 서막", content: para("칼과 방패가 부딪쳤다") }),
  doc({ id: "F", title: "1부 폴더", type: "FOLDER", content: null }),
  doc({
    id: "3",
    title: "숨겨진 문서",
    trashedAt: "2026-02-01T00:00:00.000Z",
    content: para("이야기 비밀"),
  }),
];

describe("searchDocuments", () => {
  it("빈/공백 쿼리는 빈 배열", () => {
    expect(searchDocuments(docs, "")).toEqual([]);
    expect(searchDocuments(docs, "   ")).toEqual([]);
  });

  it("제목으로 매치되면 field=title", () => {
    const r = searchDocuments(docs, "프롤로그");
    expect(r).toHaveLength(1);
    expect(r[0].doc.id).toBe("1");
    expect(r[0].field).toBe("title");
    expect(r[0].snippet).toBe("프롤로그");
  });

  it("본문으로 매치되면 field=body + 스니펫", () => {
    const r = searchDocuments(docs, "부딪");
    expect(r).toHaveLength(1);
    expect(r[0].doc.id).toBe("2");
    expect(r[0].field).toBe("body");
    expect(r[0].snippet).toContain("부딪");
  });

  it("대소문자 무시", () => {
    const en = [doc({ id: "e", title: "Hello World", content: para("The Quick Fox") })];
    expect(searchDocuments(en, "hello")).toHaveLength(1);
    expect(searchDocuments(en, "QUICK")[0].field).toBe("body");
  });

  it("매치 없으면 빈 배열", () => {
    expect(searchDocuments(docs, "존재하지않는단어")).toEqual([]);
  });

  it("폴더는 제외(결과는 열 수 있는 DOC만)", () => {
    expect(searchDocuments(docs, "폴더")).toEqual([]);
  });

  it("휴지통 문서는 제외", () => {
    // '이야기'는 문서1(본문)과 휴지통 문서3(본문)에 모두 있지만 3은 빠진다
    const r = searchDocuments(docs, "이야기");
    expect(r.map((m) => m.doc.id)).toEqual(["1"]);
  });
});
