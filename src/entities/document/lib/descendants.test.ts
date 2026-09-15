import { describe, it, expect } from "vitest";
import { collectDescendantDocs } from "./descendants";
import { sumDocCounts } from "./count";
import type { DocumentNode } from "../model/types";

function node(partial: Partial<DocumentNode> & { id: string }): DocumentNode {
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

// 1부(F) > [1화, 2부(G) > [2화, 3화], 4화], 바깥문서(루트)
const docs: DocumentNode[] = [
  node({ id: "F", type: "FOLDER", parentId: null, order: 0 }),
  node({ id: "d1", parentId: "F", order: 0, charCount: 100, charCountNoSpace: 90, wordCount: 10 }),
  node({ id: "G", type: "FOLDER", parentId: "F", order: 1 }),
  node({ id: "d2", parentId: "G", order: 0, charCount: 200, charCountNoSpace: 180, wordCount: 20 }),
  node({ id: "d3", parentId: "G", order: 1, charCount: 300, charCountNoSpace: 270, wordCount: 30 }),
  node({ id: "d4", parentId: "F", order: 2, charCount: 400, charCountNoSpace: 360, wordCount: 40 }),
  node({ id: "out", parentId: null, order: 1, charCount: 999, charCountNoSpace: 999, wordCount: 99 }),
];

describe("collectDescendantDocs", () => {
  it("하위 폴더 안 문서까지 트리 순서(깊이우선)로 모은다", () => {
    expect(collectDescendantDocs(docs, "F").map((d) => d.id)).toEqual([
      "d1",
      "d2",
      "d3",
      "d4",
    ]);
  });

  it("폴더 자체와 바깥 문서는 제외한다", () => {
    const ids = collectDescendantDocs(docs, "F").map((d) => d.id);
    expect(ids).not.toContain("G");
    expect(ids).not.toContain("out");
  });

  it("중첩 폴더를 직접 고르면 그 아래만 모은다", () => {
    expect(collectDescendantDocs(docs, "G").map((d) => d.id)).toEqual(["d2", "d3"]);
  });

  it("order가 뒤섞여 있어도 order 오름차순으로 이어 붙인다", () => {
    const shuffled = [
      node({ id: "F", type: "FOLDER", parentId: null, order: 0 }),
      node({ id: "b", parentId: "F", order: 2 }),
      node({ id: "a", parentId: "F", order: 0 }),
      node({ id: "c", parentId: "F", order: 1 }),
    ];
    expect(collectDescendantDocs(shuffled, "F").map((d) => d.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("휴지통에 든 문서·폴더는 건너뛴다", () => {
    const trashed = docs.map((d) =>
      d.id === "d2" || d.id === "d4" ? { ...d, trashedAt: "2026-02-02T00:00:00.000Z" } : d,
    );
    expect(collectDescendantDocs(trashed, "F").map((d) => d.id)).toEqual(["d1", "d3"]);
  });

  it("빈 폴더·본문 문서·없는 id는 빈 배열", () => {
    const withEmpty = [...docs, node({ id: "E", type: "FOLDER", parentId: null, order: 2 })];
    expect(collectDescendantDocs(withEmpty, "E")).toEqual([]);
    expect(collectDescendantDocs(docs, "d1")).toEqual([]);
    expect(collectDescendantDocs(docs, "없음")).toEqual([]);
  });

  it("부모-자식이 고리를 이뤄도 멈춘다", () => {
    const cyclic = [
      node({ id: "F", type: "FOLDER", parentId: "G", order: 0 }),
      node({ id: "G", type: "FOLDER", parentId: "F", order: 0 }),
      node({ id: "x", parentId: "G", order: 0 }),
    ];
    expect(collectDescendantDocs(cyclic, "F").map((d) => d.id)).toEqual(["x"]);
  });

  it("모은 문서의 합계 분량이 폴더 헤더 수치가 된다", () => {
    const sum = sumDocCounts(collectDescendantDocs(docs, "F"), "chars");
    expect(sum).toBe(100 + 200 + 300 + 400);
  });
});
