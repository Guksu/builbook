import { describe, expect, it } from "vitest";
import { filterTreeByLabel } from "./filterLabel";
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

// 1부(폴더) > [1화(복선), 2부(폴더) > [2화(라벨 없음)]], 3화(복선), 빈부(폴더)
const docs: DocumentNode[] = [
  node({ id: "f1", type: "FOLDER" }),
  node({ id: "d1", parentId: "f1", label: "복선" }),
  node({ id: "f2", type: "FOLDER", parentId: "f1", order: 1 }),
  node({ id: "d2", parentId: "f2" }),
  node({ id: "d3", order: 1, label: "복선" }),
  node({ id: "empty", type: "FOLDER", order: 2 }),
];

const ids = (list: DocumentNode[]) => list.map((d) => d.id);

describe("filterTreeByLabel", () => {
  it("필터를 끄면(null) 전체를 그대로 돌려준다", () => {
    expect(ids(filterTreeByLabel(docs, null))).toEqual(ids(docs));
  });

  it("라벨이 걸린 문서와 그 조상 폴더만 남긴다", () => {
    // d1의 조상 f1은 남고, 걸린 문서가 없는 f2·empty는 사라진다.
    expect(ids(filterTreeByLabel(docs, "복선"))).toEqual(["f1", "d1", "d3"]);
  });

  it("'라벨 없음'은 라벨이 비어 있는 문서만(폴더는 길로만 남는다)", () => {
    expect(ids(filterTreeByLabel(docs, "none"))).toEqual(["f1", "f2", "d2"]);
  });

  it("걸리는 문서가 없으면 폴더만 남기지 않고 빈 트리를 준다", () => {
    expect(filterTreeByLabel(docs, "없는라벨")).toEqual([]);
  });

  it("원본 순서를 유지한다(정렬은 flattenVisible이 맡는다)", () => {
    const filtered = filterTreeByLabel(docs, "복선");
    expect(filtered).toEqual([docs[0], docs[1], docs[4]]);
  });
});
