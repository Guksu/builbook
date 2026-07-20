import { describe, it, expect } from "vitest";
import {
  collectSubtreeIds,
  selectActiveDocuments,
  selectTrashedDocuments,
  selectTrashRoots,
  flattenTree,
} from "./tree";
import type { DocumentNode } from "../model/types";

// 테스트용 최소 노드 팩토리 — 관심 필드만 지정.
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

// 트리: folder(F) > [doc a, folder(G) > doc b], doc c(루트)
const tree: DocumentNode[] = [
  node({ id: "F", type: "FOLDER", parentId: null, order: 0 }),
  node({ id: "a", parentId: "F", order: 0 }),
  node({ id: "G", type: "FOLDER", parentId: "F", order: 1 }),
  node({ id: "b", parentId: "G", order: 0 }),
  node({ id: "c", parentId: null, order: 1 }),
];

describe("collectSubtreeIds", () => {
  it("루트 + 모든 자손을 수집한다(중첩 폴더)", () => {
    expect(collectSubtreeIds(tree, "F").sort()).toEqual(["F", "G", "a", "b"]);
  });
  it("리프 문서는 자기 자신만", () => {
    expect(collectSubtreeIds(tree, "c")).toEqual(["c"]);
  });
  it("없는 id는 그 id만 반환", () => {
    expect(collectSubtreeIds(tree, "zzz")).toEqual(["zzz"]);
  });
});

describe("selectActive/Trashed", () => {
  const mixed: DocumentNode[] = [
    node({ id: "x" }),
    node({ id: "y", trashedAt: "2026-02-01T00:00:00.000Z" }),
  ];
  it("정상 문서만 남긴다", () => {
    expect(selectActiveDocuments(mixed).map((d) => d.id)).toEqual(["x"]);
  });
  it("휴지통 문서만 남긴다", () => {
    expect(selectTrashedDocuments(mixed).map((d) => d.id)).toEqual(["y"]);
  });
  it("빈 배열은 빈 배열", () => {
    expect(selectActiveDocuments([])).toEqual([]);
  });
});

describe("selectTrashRoots", () => {
  it("부모가 휴지통이 아닌 삭제 문서만 루트로 노출(폴더 서브트리째 삭제 시 폴더만)", () => {
    // F 서브트리 전체를 삭제(F,a,G,b) + 개별 삭제한 루트 문서 c
    const t = "2026-02-01T00:00:00.000Z";
    const docs = tree.map((d) =>
      ["F", "a", "G", "b"].includes(d.id) ? { ...d, trashedAt: t } : d,
    );
    docs[docs.findIndex((d) => d.id === "c")] = {
      ...docs.find((d) => d.id === "c")!,
      trashedAt: "2026-02-02T00:00:00.000Z",
    };
    const roots = selectTrashRoots(docs).map((d) => d.id);
    // F(서브트리 루트)와 c(개별 삭제) 만 — a,G,b 는 F 아래라 숨김
    expect(roots.sort()).toEqual(["F", "c"]);
  });
  it("최신 삭제가 먼저 온다(trashedAt 내림차순)", () => {
    const docs = [
      node({ id: "old", trashedAt: "2026-02-01T00:00:00.000Z" }),
      node({ id: "new", trashedAt: "2026-03-01T00:00:00.000Z" }),
    ];
    expect(selectTrashRoots(docs).map((d) => d.id)).toEqual(["new", "old"]);
  });
  it("휴지통이 비면 빈 배열", () => {
    expect(selectTrashRoots(tree)).toEqual([]);
  });
});

describe("flattenTree", () => {
  it("깊이우선 + order 순서로 평탄화하고 depth를 매긴다", () => {
    const flat = flattenTree(tree);
    expect(flat.map((f) => [f.node.id, f.depth])).toEqual([
      ["F", 0],
      ["a", 1],
      ["G", 1],
      ["b", 2],
      ["c", 0],
    ]);
  });
});
