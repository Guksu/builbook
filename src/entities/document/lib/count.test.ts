import { describe, expect, it } from "vitest";
import { measureDocument, docCount, sumDocCounts } from "./count";
import type { DocumentNode } from "../model/types";

const text = (t: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
});
const node = (over: Partial<DocumentNode>): DocumentNode => ({
  id: "d",
  projectId: "p",
  parentId: null,
  type: "DOC",
  title: "t",
  order: 0,
  content: null,
  synopsis: null,
  wordCount: 0,
  createdAt: "t",
  updatedAt: "t",
  ...over,
});

describe("measureDocument", () => {
  it("저장된 세 수치가 있으면 그대로 쓴다", () => {
    const m = measureDocument(node({ wordCount: 2, charCount: 9, charCountNoSpace: 8 }));
    expect(m).toEqual({ words: 2, chars: 9, charsNoSpace: 8 });
  });
  it("옛 레코드(글자 수 없음)는 본문에서 다시 센다", () => {
    const m = measureDocument(node({ wordCount: 99, content: text("가 나 다") }));
    expect(m).toEqual({ words: 3, chars: 5, charsNoSpace: 3 });
  });
  it("본문도 없으면 단어 수만 살리고 나머지는 0", () => {
    expect(measureDocument(node({ wordCount: 4 }))).toEqual({ words: 4, chars: 0, charsNoSpace: 0 });
  });
  it("폴더는 항상 0", () => {
    expect(measureDocument(node({ type: "FOLDER", wordCount: 5, charCount: 5, charCountNoSpace: 5 }))).toEqual({
      words: 0,
      chars: 0,
      charsNoSpace: 0,
    });
  });
});

describe("docCount / sumDocCounts", () => {
  const docs = [
    node({ id: "a", wordCount: 1, charCount: 10, charCountNoSpace: 8 }),
    node({ id: "b", wordCount: 2, charCount: 20, charCountNoSpace: 16 }),
    node({ id: "f", type: "FOLDER", wordCount: 100, charCount: 100, charCountNoSpace: 100 }),
  ];
  it("단위별로 고른다", () => {
    expect(docCount(docs[0], "chars")).toBe(10);
    expect(docCount(docs[0], "charsNoSpace")).toBe(8);
    expect(docCount(docs[0], "words")).toBe(1);
  });
  it("합계는 DOC만", () => {
    expect(sumDocCounts(docs, "chars")).toBe(30);
    expect(sumDocCounts(docs, "words")).toBe(3);
    expect(sumDocCounts([], "chars")).toBe(0);
  });
});
