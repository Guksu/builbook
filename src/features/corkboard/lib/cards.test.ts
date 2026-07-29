import { describe, expect, it } from "vitest";
import {
  buildCards,
  docStatusLabel,
  nextStatus,
  normalizeStatus,
  summarizeCards,
} from "./cards";
import type { DocumentNode } from "@entities/document";

const text = (s: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: s }] }],
});

const node = (over: Partial<DocumentNode> & { id: string }): DocumentNode => ({
  projectId: "p1",
  parentId: null,
  type: "DOC",
  title: over.id,
  order: 0,
  content: null,
  synopsis: null,
  wordCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("상태 순환", () => {
  it("초고 → 퇴고 → 완료 → 초고", () => {
    expect(nextStatus("draft")).toBe("revise");
    expect(nextStatus("revise")).toBe("done");
    expect(nextStatus("done")).toBe("draft");
  });

  it("미설정·이상한 값은 초고로 본다", () => {
    expect(normalizeStatus(undefined)).toBe("draft");
    expect(normalizeStatus("완료")).toBe("draft");
    expect(nextStatus(undefined)).toBe("revise");
  });

  it("한국어 라벨", () => {
    expect(docStatusLabel("draft")).toBe("초고");
    expect(docStatusLabel("revise")).toBe("퇴고");
    expect(docStatusLabel("done")).toBe("완료");
  });
});

describe("buildCards", () => {
  it("바인더 순서·깊이를 그대로 옮긴다(폴더 포함)", () => {
    const docs = [
      node({ id: "f1", type: "FOLDER", title: "1부", order: 0 }),
      node({ id: "d1", title: "1화", parentId: "f1", order: 0 }),
      node({ id: "d2", title: "2화", order: 1 }),
    ];
    const cards = buildCards(docs);
    expect(cards.map((c) => c.title)).toEqual(["1부", "1화", "2화"]);
    expect(cards.map((c) => c.depth)).toEqual([0, 1, 0]);
  });

  it("시놉시스·분량·상태를 담는다", () => {
    const cards = buildCards([
      node({
        id: "d1",
        title: "1화",
        synopsis: "  주인공이 회귀한다  ",
        content: text("가 나 다"),
        status: "done",
      }),
    ]);
    expect(cards[0]).toMatchObject({
      synopsis: "주인공이 회귀한다",
      words: 3,
      chars: 5,
      status: "done",
    });
  });

  it("휴지통 문서는 보드에 올리지 않는다", () => {
    const cards = buildCards([
      node({ id: "d1", title: "살아있음" }),
      node({ id: "d2", title: "버림", order: 1, trashedAt: "2026-07-01T00:00:00.000Z" }),
    ]);
    expect(cards.map((c) => c.title)).toEqual(["살아있음"]);
  });

  it("시놉시스가 없으면 빈 문자열", () => {
    expect(buildCards([node({ id: "d1" })])[0].synopsis).toBe("");
  });
});

describe("summarizeCards", () => {
  it("본문 문서만 세고 상태별로 나눈다(폴더 제외)", () => {
    const cards = buildCards([
      node({ id: "f1", type: "FOLDER", title: "1부", order: 0 }),
      node({ id: "d1", parentId: "f1", synopsis: "요약 있음", status: "done" }),
      node({ id: "d2", parentId: "f1", order: 1, status: "revise" }),
      node({ id: "d3", order: 1 }),
    ]);
    expect(summarizeCards(cards)).toEqual({
      total: 3,
      withSynopsis: 1,
      draft: 1,
      revise: 1,
      done: 1,
    });
  });
});
