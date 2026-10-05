// 리서치 노트 → 바인더 인물·설정 카드 변환 규칙(순수 함수).
// 인물 정보를 담는 곳이 노트·카드·사전 세 군데로 나뉘어 있었다. 관계도·영감·검색은 카드만 읽으므로
// 노트를 카드로 옮겨 한 곳으로 모은다(2026-10). 같은 노트는 언제 옮겨도 같은 id가 되게 해서
// 두 번 옮겨도(탭 두 개, 개발 모드 이중 실행, 옛 백업 복원) 카드가 겹치지 않는다.

import type { Note } from "@entities/note";
import type { DocumentKind } from "@entities/document";

export const RESEARCH_FOLDER_TITLE = "리서치 노트";

export const researchFolderId = (projectId: string) => `research-folder-${projectId}`;
export const cardIdForNote = (noteId: string) => `note-card-${noteId}`;

type PMNode = { type: string; attrs?: Record<string, unknown>; content?: PMNode[]; text?: string };

const heading = (text: string): PMNode => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});
const paragraph = (text: string): PMNode =>
  text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" };

export function noteKind(note: Pick<Note, "category">): DocumentKind {
  return note.category === "CHARACTER" ? "character" : "setting";
}

/** 노트 본문 → 카드 본문(ProseMirror JSON). 역할(인물만)과 설명을 제목 아래 문단으로 둔다. */
export function noteToCardContent(note: Pick<Note, "category" | "role" | "body">): unknown {
  const content: PMNode[] = [];
  if (note.category === "CHARACTER" && note.role?.trim()) {
    content.push(heading("역할"), paragraph(note.role.trim()));
  }
  const lines = note.body.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.some((l) => l.trim())) {
    content.push(heading("설명"), ...lines.map((l) => paragraph(l.trim())));
  }
  if (content.length === 0) content.push(paragraph(""));
  return { type: "doc", content };
}

/** 옮기는 순서 — 인물 먼저, 그다음 설정. 같은 종류는 만든 순서대로. */
export function sortNotesForCards<T extends Pick<Note, "category" | "createdAt" | "title">>(
  notes: readonly T[],
): T[] {
  const rank = (n: T) => (n.category === "CHARACTER" ? 0 : 1);
  return notes
    .slice()
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.title.localeCompare(b.title, "ko"),
    );
}
