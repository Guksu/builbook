import { describe, it, expect } from "vitest";
import { buildContext, headTruncate, tailTruncate, MAX_BODY_CHARS } from "./context";
import type { DocumentNode } from "@entities/document";

const doc = (over: Partial<DocumentNode>): DocumentNode => ({
  id: "d",
  projectId: "p",
  parentId: null,
  type: "DOC",
  title: "1화",
  order: 0,
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "본문 문장." }] }] },
  synopsis: null,
  wordCount: 0,
  charCount: 0,
  charCountNoSpace: 0,
  createdAt: "",
  updatedAt: "",
  ...over,
});

describe("truncate", () => {
  it("tail은 끝을 남기고 표식을 붙인다", () => {
    const t = tailTruncate("가".repeat(10) + "나", 5);
    expect(t.truncated).toBe(true);
    expect(t.text.endsWith("가가가가나")).toBe(true);
    expect(t.text.startsWith("…(앞부분 생략)")).toBe(true);
  });
  it("head는 앞을 남긴다", () => {
    expect(headTruncate("abcdef", 3)).toEqual({ text: "abc\n…(뒷부분 생략)", truncated: true });
    expect(headTruncate("ab", 3)).toEqual({ text: "ab", truncated: false });
  });
});

describe("buildContext", () => {
  const base = { projectTitle: "회귀한 검사", characterDocs: [], settingDocs: [] };
  it("선택 문단이 있으면 그것을 본문으로 쓴다", () => {
    const ctx = buildContext({ ...base, doc: doc({}), selectionText: "  선택한 문장 " });
    expect(ctx.body).toBe("선택한 문장");
    expect(ctx.bodySource).toBe("selection");
  });
  it("선택이 없으면 현재 회차 본문, 그것도 없으면 none", () => {
    expect(buildContext({ ...base, doc: doc({}), selectionText: "" }).bodySource).toBe("document");
    expect(buildContext({ ...base, doc: null, selectionText: "" }).bodySource).toBe("none");
    expect(buildContext({ ...base, doc: doc({ type: "FOLDER", content: null }), selectionText: "" }).bodySource).toBe("none");
  });
  it("본문은 상한에서 잘리고 표시된다", () => {
    const long = "글".repeat(MAX_BODY_CHARS + 100);
    const ctx = buildContext({ ...base, doc: null, selectionText: long });
    expect(ctx.bodyTruncated).toBe(true);
    expect(ctx.body.length).toBeLessThan(long.length);
  });
  it("인물 카드는 '- 제목: 내용' 줄로 묶인다", () => {
    const ctx = buildContext({
      ...base,
      doc: null,
      selectionText: "",
      characterDocs: [doc({ title: "테아르", kind: "character" })],
    });
    expect(ctx.characters).toBe("- 테아르: 본문 문장.");
  });
});
