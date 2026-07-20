import { describe, it, expect } from "vitest";
import type { Note } from "../model/types";
import {
  sortNotes,
  filterByCategory,
  countByCategory,
  isValidNoteTitle,
  notePreview,
} from "./notes";

// 노트 픽스처 헬퍼 — 필요한 필드만 지정하고 나머지는 기본값.
const note = (over: Partial<Note> & Pick<Note, "id">): Note => ({
  projectId: "p1",
  category: "CHARACTER",
  title: "이름",
  role: null,
  body: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("sortNotes", () => {
  it("최근 수정순(내림차순)으로 정렬한다", () => {
    const a = note({ id: "a", updatedAt: "2026-01-01T00:00:00.000Z" });
    const b = note({ id: "b", updatedAt: "2026-03-01T00:00:00.000Z" });
    const c = note({ id: "c", updatedAt: "2026-02-01T00:00:00.000Z" });
    expect(sortNotes([a, b, c]).map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("원본 배열을 변형하지 않는다(순수)", () => {
    const input = [
      note({ id: "a", updatedAt: "2026-01-01T00:00:00.000Z" }),
      note({ id: "b", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const snapshot = input.map((n) => n.id);
    sortNotes(input);
    expect(input.map((n) => n.id)).toEqual(snapshot);
  });

  it("updatedAt이 같으면 제목 오름차순으로 안정화한다", () => {
    const a = note({ id: "a", title: "나비", updatedAt: "2026-01-01T00:00:00.000Z" });
    const b = note({ id: "b", title: "가로등", updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(sortNotes([a, b]).map((n) => n.title)).toEqual(["가로등", "나비"]);
  });
});

describe("filterByCategory", () => {
  it("지정 카테고리만 남긴다", () => {
    const notes = [
      note({ id: "a", category: "CHARACTER" }),
      note({ id: "b", category: "SETTING" }),
      note({ id: "c", category: "CHARACTER" }),
    ];
    expect(filterByCategory(notes, "CHARACTER").map((n) => n.id)).toEqual(["a", "c"]);
    expect(filterByCategory(notes, "SETTING").map((n) => n.id)).toEqual(["b"]);
  });
});

describe("countByCategory", () => {
  it("카테고리별 개수를 집계한다", () => {
    const notes = [
      note({ id: "a", category: "CHARACTER" }),
      note({ id: "b", category: "SETTING" }),
      note({ id: "c", category: "CHARACTER" }),
    ];
    expect(countByCategory(notes)).toEqual({ CHARACTER: 2, SETTING: 1 });
  });

  it("빈 목록은 0/0을 반환한다", () => {
    expect(countByCategory([])).toEqual({ CHARACTER: 0, SETTING: 0 });
  });
});

describe("isValidNoteTitle", () => {
  it("공백만 있으면 무효", () => {
    expect(isValidNoteTitle("   ")).toBe(false);
    expect(isValidNoteTitle("")).toBe(false);
  });
  it("내용이 있으면 유효", () => {
    expect(isValidNoteTitle(" 홍길동 ")).toBe(true);
  });
});

describe("notePreview", () => {
  it("첫 줄만 보여준다", () => {
    expect(notePreview("첫 줄\n둘째 줄")).toBe("첫 줄");
  });
  it("최대 길이를 넘으면 말줄임표를 붙인다", () => {
    expect(notePreview("가나다라마바사", 3)).toBe("가나다…");
  });
  it("빈 body는 빈 문자열", () => {
    expect(notePreview("")).toBe("");
  });
});
