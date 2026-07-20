import type { Note, NoteCategory } from "../model/types";

// 리서치 노트의 순수 로직(정렬·필터·유효성·미리보기). DB/React에 비종속 → 단위 테스트 대상.
// Note 타입에만 의존하므로 entities/note가 소유한다(features가 아님 — FSD 레이어 방향 준수).

/** 최근 수정순(내림차순) 정렬. updatedAt이 같으면 제목 오름차순으로 안정화. */
export function sortNotes(notes: Note[]): Note[] {
  return notes.slice().sort((a, b) => {
    const byTime = b.updatedAt.localeCompare(a.updatedAt);
    return byTime !== 0 ? byTime : a.title.localeCompare(b.title, "ko");
  });
}

/** 카테고리별로 거른다. */
export function filterByCategory(notes: Note[], category: NoteCategory): Note[] {
  return notes.filter((n) => n.category === category);
}

/** 카테고리별 개수 집계 — 빈 상태·탭 배지에 사용. */
export function countByCategory(notes: Note[]): Record<NoteCategory, number> {
  return {
    CHARACTER: notes.filter((n) => n.category === "CHARACTER").length,
    SETTING: notes.filter((n) => n.category === "SETTING").length,
  };
}

/** 제목 유효성 — 공백만 있으면 무효(생성/수정 버튼 게이팅). */
export function isValidNoteTitle(title: string): boolean {
  return title.trim().length > 0;
}

/** 목록 카드의 한 줄 미리보기. body 첫 줄을 잘라서 보여준다. */
export function notePreview(body: string, max = 60): string {
  const firstLine = body.trim().split("\n")[0]?.trim() ?? "";
  if (firstLine.length <= max) return firstLine;
  return firstLine.slice(0, max).trimEnd() + "…";
}
