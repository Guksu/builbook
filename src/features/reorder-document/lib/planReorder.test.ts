import { describe, it, expect } from "vitest";
import type { DocumentNode } from "@entities/document";
import { planReorder } from "./planReorder";

// 테스트 픽스처: 평면 배열 트리
//   root
//   ├─ folderA (order 0)
//   │   ├─ doc1 (order 0)
//   │   └─ folderB (order 1)
//   │       └─ doc2 (order 0)
//   └─ doc3 (order 1)
function node(
  id: string,
  parentId: string | null,
  order: number,
  type: DocumentNode["type"] = "DOC",
): DocumentNode {
  return {
    id,
    projectId: "p1",
    parentId,
    type,
    title: id,
    order,
    content: null,
    synopsis: null,
    wordCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const docs: DocumentNode[] = [
  node("folderA", null, 0, "FOLDER"),
  node("doc1", "folderA", 0),
  node("folderB", "folderA", 1, "FOLDER"),
  node("doc2", "folderB", 0),
  node("doc3", null, 1),
];

describe("planReorder — into (폴더 안으로 이동)", () => {
  it("문서를 폴더 안 맨 끝에 append한다", () => {
    expect(planReorder(docs, "doc3", "folderA", "into")).toEqual({
      kind: "move",
      id: "doc3",
      parentId: "folderA",
      order: 2, // folderA의 기존 자식 2개 뒤
    });
  });

  it("빈 폴더로 이동하면 order 0을 받는다", () => {
    const withEmpty = [...docs, node("folderC", null, 2, "FOLDER")];
    expect(planReorder(withEmpty, "doc1", "folderC", "into")).toEqual({
      kind: "move",
      id: "doc1",
      parentId: "folderC",
      order: 0,
    });
  });

  it("자기 자신 안으로는 이동 불가", () => {
    expect(planReorder(docs, "folderA", "folderA", "into")).toBeNull();
  });

  it("자기 자손 폴더 안으로는 이동 불가 (순환 방지)", () => {
    expect(planReorder(docs, "folderA", "folderB", "into")).toBeNull();
  });
});

describe("planReorder — before (형제 재정렬)", () => {
  it("target 바로 앞에 삽입한 형제 순서를 반환한다", () => {
    expect(planReorder(docs, "doc3", "folderA", "before")).toEqual({
      kind: "reorder",
      parentId: null,
      orderedIds: ["doc3", "folderA"],
    });
  });

  it("다른 부모의 형제 그룹으로 이동하며 삽입한다", () => {
    expect(planReorder(docs, "doc3", "folderB", "before")).toEqual({
      kind: "reorder",
      parentId: "folderA",
      orderedIds: ["doc1", "doc3", "folderB"],
    });
  });

  it("같은 그룹 내 재정렬에서 자기 자신은 형제 목록에서 제외된다", () => {
    expect(planReorder(docs, "folderB", "doc1", "before")).toEqual({
      kind: "reorder",
      parentId: "folderA",
      orderedIds: ["folderB", "doc1"],
    });
  });

  it("폴더를 자기 자손 옆으로 옮기면 순환이라 막는다", () => {
    expect(planReorder(docs, "folderA", "doc2", "before")).toBeNull();
  });

  it("루트 레벨(parentId null)로의 재정렬은 허용된다", () => {
    expect(planReorder(docs, "doc1", "doc3", "before")).toEqual({
      kind: "reorder",
      parentId: null,
      orderedIds: ["folderA", "doc1", "doc3"],
    });
  });
});

describe("planReorder — 방어 케이스", () => {
  it("drag와 target이 같으면 null", () => {
    expect(planReorder(docs, "doc1", "doc1", "into")).toBeNull();
  });

  it("존재하지 않는 노드면 null", () => {
    expect(planReorder(docs, "ghost", "doc1", "into")).toBeNull();
    expect(planReorder(docs, "doc1", "ghost", "before")).toBeNull();
  });

  it("parentId 순환 데이터가 있어도 무한 루프에 빠지지 않는다", () => {
    const cyclic = [
      { ...node("a", "b", 0, "FOLDER") },
      { ...node("b", "a", 0, "FOLDER") },
      node("c", null, 0),
    ];
    expect(planReorder(cyclic, "c", "a", "into")).toEqual({
      kind: "move",
      id: "c",
      parentId: "a",
      order: 1,
    });
  });
});
