import { describe, expect, it } from "vitest";
import { collectFolderIds, flattenVisible } from "./flatten";
import type { DocumentNode } from "@entities/document";

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

// 1부(폴더) > [1화, 2화], 3화
const docs: DocumentNode[] = [
  node({ id: "f1", type: "FOLDER", title: "1부", order: 0 }),
  node({ id: "d1", title: "1화", parentId: "f1", order: 0 }),
  node({ id: "d2", title: "2화", parentId: "f1", order: 1 }),
  node({ id: "d3", title: "3화", order: 1 }),
];

describe("flattenVisible", () => {
  it("펼친 상태: 깊이우선 순서와 depth를 매긴다", () => {
    const rows = flattenVisible(docs, new Set());
    expect(rows.map((r) => r.node.id)).toEqual(["f1", "d1", "d2", "d3"]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 1, 0]);
  });

  it("접힌 폴더의 자식은 아예 빠진다(키보드 이동 순서 = 렌더 순서)", () => {
    const rows = flattenVisible(docs, new Set(["f1"]));
    expect(rows.map((r) => r.node.id)).toEqual(["f1", "d3"]);
    expect(rows[0].expanded).toBe(false);
    expect(rows[0].hasChildren).toBe(true);
  });

  it("빈 폴더는 hasChildren=false", () => {
    const rows = flattenVisible([node({ id: "f9", type: "FOLDER" })], new Set());
    expect(rows[0].hasChildren).toBe(false);
  });

  it("정렬 기준을 바꾸면 형제 순서만 바뀐다(계층은 유지)", () => {
    const rows = flattenVisible(
      [
        node({ id: "f1", type: "FOLDER", title: "나폴더", order: 0 }),
        node({ id: "d1", title: "나중", parentId: "f1", order: 0 }),
        node({ id: "d2", title: "가장", parentId: "f1", order: 1 }),
        node({ id: "d3", title: "가루트", order: 1 }),
      ],
      new Set(),
      "title",
    );
    expect(rows.map((r) => r.node.id)).toEqual(["d3", "f1", "d2", "d1"]);
  });

  it("문서는 expanded/hasChildren이 항상 false", () => {
    const rows = flattenVisible(docs, new Set());
    const doc = rows.find((r) => r.node.id === "d3")!;
    expect(doc.expanded).toBe(false);
    expect(doc.hasChildren).toBe(false);
  });
});

describe("collectFolderIds", () => {
  it("폴더 id만 모은다", () => {
    expect(collectFolderIds(docs)).toEqual(["f1"]);
  });
});
