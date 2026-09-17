import { describe, it, expect } from "vitest";
import { episodeDocs, episodeOrder } from "./episodes";
import type { DocumentNode } from "@entities/document";

const doc = (id: string, over: Partial<DocumentNode> = {}): DocumentNode => ({
  id, projectId: "p", parentId: null, type: "DOC", title: id, order: 0, content: null, synopsis: null,
  wordCount: 0, charCount: 0, charCountNoSpace: 0, createdAt: "", updatedAt: "", ...over,
});

describe("episodes", () => {
  it("바인더 순서로 원고 회차만 고른다(폴더 안 포함, 카드 제외)", () => {
    const docs = [
      doc("folder", { type: "FOLDER", order: 0 }),
      doc("ep2", { parentId: "folder", order: 1 }),
      doc("ep1", { parentId: "folder", order: 0 }),
      doc("hero", { kind: "character", order: 1 }),
      doc("ep3", { order: 2 }),
    ];
    expect(episodeDocs(docs).map((d) => d.id)).toEqual(["ep1", "ep2", "ep3"]);
    expect(episodeOrder(docs).get("ep3")).toBe(2);
    expect(episodeOrder(docs).has("hero")).toBe(false);
  });
});
