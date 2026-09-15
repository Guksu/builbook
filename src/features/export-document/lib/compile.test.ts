import { describe, expect, it } from "vitest";
import type { DocumentNode } from "@entities/document";
import { DEFAULT_COMPILE, compileManuscript, countEpisodes } from "./compile";

const para = (t: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] });
const node = (over: Partial<DocumentNode> & { id: string }): DocumentNode => ({
  projectId: "p",
  parentId: null,
  type: "DOC",
  title: over.id,
  order: 0,
  content: null,
  synopsis: null,
  wordCount: 0,
  createdAt: "t",
  updatedAt: "t",
  ...over,
});

//  1부(폴더) ─ 1화, 2화 / 인물카드 / 2부(폴더) ─ 3화 / 4화(최상위)
const docs = [
  node({ id: "f1", type: "FOLDER", title: "1부", order: 0 }),
  node({ id: "e1", parentId: "f1", title: "1화", content: para("하나") }),
  node({ id: "e2", parentId: "f1", title: "2화", content: para("둘"), order: 1 }),
  node({ id: "c1", parentId: "f1", title: "카드", kind: "character", order: 2 }),
  node({ id: "f2", type: "FOLDER", title: "2부", order: 1 }),
  node({ id: "e3", parentId: "f2", title: "3화", content: para("셋") }),
  node({ id: "e4", title: "4화", content: para("넷"), order: 2 }),
];

describe("countEpisodes", () => {
  it("원고 문서만 센다(카드·폴더 제외)", () => {
    expect(countEpisodes(docs)).toBe(4);
  });
});

describe("compileManuscript", () => {
  it("기본 옵션: 작품 제목 + 폴더 + 회차 전부, 카드 제외", () => {
    const secs = compileManuscript("내 소설", docs);
    expect(secs.map((s) => [s.kind, s.title])).toEqual([
      ["project", "내 소설"],
      ["folder", "1부"],
      ["episode", "1화"],
      ["episode", "2화"],
      ["folder", "2부"],
      ["episode", "3화"],
      ["episode", "4화"],
    ]);
    expect(secs.every((s) => !s.separatorBefore)).toBe(true);
  });
  it("회차 범위: 3~4화만, 회차 없는 폴더는 빠진다", () => {
    const secs = compileManuscript("내 소설", docs, { ...DEFAULT_COMPILE, fromEpisode: 3, toEpisode: 4 });
    expect(secs.map((s) => s.title)).toEqual(["내 소설", "2부", "3화", "4화"]);
    expect(secs.find((s) => s.title === "3화")?.episodeNo).toBe(3);
  });
  it("범위가 뒤집히거나 넘치면 바로잡는다", () => {
    const secs = compileManuscript("x", docs, { ...DEFAULT_COMPILE, fromEpisode: 9, toEpisode: 1 });
    expect(secs.filter((s) => s.kind === "episode").map((s) => s.title)).toEqual(["4화"]);
  });
  it("구분선은 두 번째 회차부터", () => {
    const secs = compileManuscript("x", docs, { ...DEFAULT_COMPILE, separator: "stars" });
    const eps = secs.filter((s) => s.kind === "episode");
    expect(eps.map((s) => !!s.separatorBefore)).toEqual([false, true, true, true]);
  });
  it("제목·폴더·작품 제목을 뺄 수 있다", () => {
    const secs = compileManuscript("x", docs, {
      ...DEFAULT_COMPILE,
      includeTitles: false,
      includeFolders: false,
      includeProjectTitle: false,
    });
    expect(secs.every((s) => s.kind === "episode" && s.title === "")).toBe(true);
    expect(secs.map((s) => s.body)).toEqual(["하나", "둘", "셋", "넷"]);
  });
  it("회차가 없으면 작품 제목만", () => {
    expect(compileManuscript("x", [node({ id: "f", type: "FOLDER" })]).map((s) => s.kind)).toEqual(["project"]);
  });
});
