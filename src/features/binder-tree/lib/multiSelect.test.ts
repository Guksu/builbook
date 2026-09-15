import { describe, expect, it } from "vitest";
import { dropDescendants, selectRange } from "./multiSelect";
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

// 1부(폴더) > [1화, 2부(폴더) > [2화]], 3화
const docs: DocumentNode[] = [
  node({ id: "f1", type: "FOLDER" }),
  node({ id: "d1", parentId: "f1" }),
  node({ id: "f2", type: "FOLDER", parentId: "f1", order: 1 }),
  node({ id: "d2", parentId: "f2" }),
  node({ id: "d3", order: 1 }),
];

describe("selectRange", () => {
  const visible = ["f1", "d1", "f2", "d2", "d3"];

  it("anchor부터 클릭 지점까지 보이는 순서로 고른다", () => {
    expect(selectRange(visible, "d1", "d3")).toEqual(["d1", "f2", "d2", "d3"]);
  });

  it("위로 거슬러 골라도 범위는 같다(순서는 화면 순서)", () => {
    expect(selectRange(visible, "d3", "d1")).toEqual(["d1", "f2", "d2", "d3"]);
  });

  it("anchor가 없거나 사라졌으면 클릭한 항목만", () => {
    expect(selectRange(visible, null, "d2")).toEqual(["d2"]);
    expect(selectRange(visible, "지워진id", "d2")).toEqual(["d2"]);
  });

  it("클릭 지점이 보이지 않으면 빈 선택", () => {
    expect(selectRange(visible, "d1", "숨은id")).toEqual([]);
  });
});

describe("dropDescendants", () => {
  it("조상이 함께 선택됐으면 자손은 뺀다(폴더가 통째로 움직이므로)", () => {
    expect(dropDescendants(docs, ["f1", "d1", "d2", "d3"])).toEqual(["f1", "d3"]);
  });

  it("중간 폴더만 선택되면 그 폴더와 바깥 문서가 남는다", () => {
    expect(dropDescendants(docs, ["f2", "d2", "d1"])).toEqual(["f2", "d1"]);
  });

  it("형제끼리만 골랐으면 그대로 두고 입력 순서를 지킨다", () => {
    expect(dropDescendants(docs, ["d3", "d1"])).toEqual(["d3", "d1"]);
  });

  it("사라진 id는 조용히 버린다", () => {
    expect(dropDescendants(docs, ["없는id", "d3"])).toEqual(["d3"]);
  });
});
