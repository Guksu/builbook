import { describe, expect, it } from "vitest";
import type { DocumentNode } from "@entities/document";
import { rankDocuments, scoreTitle } from "./rankDocuments";

const node = (id: string, title: string, over: Partial<DocumentNode> = {}): DocumentNode => ({
  id,
  projectId: "p",
  parentId: null,
  type: "DOC",
  title,
  order: 0,
  content: null,
  synopsis: null,
  wordCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("scoreTitle", () => {
  it("시작 일치 > 단어 시작 > 포함 > 불일치", () => {
    expect(scoreTitle("12화 각성", "12")).toBe(3);
    expect(scoreTitle("12화 각성", "각성")).toBe(2);
    expect(scoreTitle("12화 각성", "성")).toBe(1);
    expect(scoreTitle("12화 각성", "회귀")).toBe(0);
  });
  it("대소문자·앞뒤 공백 무시, 빈 검색어는 전부 1", () => {
    expect(scoreTitle("Prologue", " pro ")).toBe(3);
    expect(scoreTitle("아무거나", "")).toBe(1);
  });
});

describe("rankDocuments", () => {
  const docs = [
    node("a", "1화 만남"),
    node("b", "2화 각성", { updatedAt: "2026-02-01T00:00:00.000Z" }),
    node("c", "각성의 밤", { updatedAt: "2026-03-01T00:00:00.000Z" }),
    node("d", "버린 각성", { trashedAt: "2026-01-02T00:00:00.000Z" }),
    node("f", "1부", { type: "FOLDER" }),
  ];
  it("점수순, 같은 점수면 최근 수정 순", () => {
    expect(rankDocuments(docs, "각성").map((h) => h.doc.id)).toEqual(["c", "b"]);
  });
  it("휴지통은 제외하고 폴더는 포함한다", () => {
    const ids = rankDocuments(docs, "").map((h) => h.doc.id);
    expect(ids).not.toContain("d");
    expect(ids).toContain("f");
  });
  it("빈 검색어는 최근 수정 순", () => {
    expect(rankDocuments(docs, "").map((h) => h.doc.id).slice(0, 2)).toEqual(["c", "b"]);
  });
  it("limit을 지킨다", () => {
    expect(rankDocuments(docs, "", 2)).toHaveLength(2);
  });
});
