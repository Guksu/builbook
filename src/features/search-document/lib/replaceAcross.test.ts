import { describe, expect, it } from "vitest";
import type { DocumentNode } from "@entities/document";
import { extractPlainText } from "@shared/lib";
import { planProjectReplace, replaceInContent, replaceInText } from "./replaceAcross";

const para = (...texts: unknown[]) => ({ type: "paragraph", content: texts });
const text = (t: string, marks?: unknown[]) => (marks ? { type: "text", text: t, marks } : { type: "text", text: t });
const docOf = (...paras: unknown[]) => ({ type: "doc", content: paras });

describe("replaceInText", () => {
  it("대소문자 무시, 겹치지 않는 일치를 모두 바꾼다", () => {
    expect(replaceInText("Kai와 kai, KAI", "kai", "카이")).toEqual({ text: "카이와 카이, 카이", count: 3 });
    expect(replaceInText("aaaa", "aa", "b")).toEqual({ text: "bb", count: 2 });
  });

  it("없으면 그대로, 빈 검색어는 0", () => {
    expect(replaceInText("강서준", "이몽룡", "x")).toEqual({ text: "강서준", count: 0 });
    expect(replaceInText("강서준", "", "x")).toEqual({ text: "강서준", count: 0 });
  });
});

describe("replaceInContent", () => {
  it("여러 문단·텍스트 노드에서 바꾸고 서식(marks)은 그대로 둔다", () => {
    const bold = [{ type: "bold" }];
    const before = docOf(para(text("강서준이 웃었다. "), text("강서준", bold)), para(text("다시 강서준.")));
    const { content, count } = replaceInContent(before, "강서준", "강준");
    expect(count).toBe(3);
    expect(extractPlainText(content)).toBe("강준이 웃었다. 강준\n다시 강준.");
    const firstPara = (content as { content: { content: { marks?: unknown }[] }[] }).content[0];
    expect(firstPara.content[1].marks).toEqual(bold);
  });

  it("서식이 갈린 곳(텍스트 노드 두 개에 걸친 일치)은 바꾸지 않는다", () => {
    const before = docOf(para(text("강서"), text("준", [{ type: "bold" }])));
    expect(replaceInContent(before, "강서준", "강준").count).toBe(0);
  });

  it("빈 말로 바꾸면 지우고, 다 지워진 텍스트 노드는 뺀다", () => {
    const before = docOf(para(text("가 "), text("삭제", [{ type: "italic" }]), text(" 나")));
    const { content, count } = replaceInContent(before, "삭제", "");
    expect(count).toBe(1);
    const nodes = (content as { content: { content: unknown[] }[] }).content[0].content;
    expect(nodes).toHaveLength(2);
    expect(extractPlainText(content)).toBe("가  나");
  });

  it("바꿀 게 없으면 원래 객체를 그대로 돌려준다", () => {
    const before = docOf(para(text("그대로")));
    const r = replaceInContent(before, "없음", "x");
    expect(r.count).toBe(0);
    expect(r.content).toBe(before);
  });
});

describe("planProjectReplace", () => {
  const doc = (over: Partial<DocumentNode>): DocumentNode => ({
    id: "d",
    projectId: "p",
    parentId: null,
    type: "DOC",
    title: "1화",
    order: 0,
    content: docOf(para(text("강서준과 강서준"))),
    synopsis: null,
    wordCount: 0,
    createdAt: "",
    updatedAt: "",
    ...over,
  });

  it("문서별 바꿀 곳 수 — 폴더·휴지통·0곳은 뺀다", () => {
    const plan = planProjectReplace(
      [
        doc({ id: "a", title: "1화" }),
        doc({ id: "f", type: "FOLDER", content: null }),
        doc({ id: "t", trashedAt: "2026-10-01" }),
        doc({ id: "z", content: docOf(para(text("다른 사람"))) }),
      ],
      "강서준",
    );
    expect(plan).toEqual([{ id: "a", title: "1화", count: 2 }]);
  });

  it("빈 검색어는 계획이 없다", () => {
    expect(planProjectReplace([doc({})], "  ")).toEqual([]);
  });
});
