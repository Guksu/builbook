import type { Idea, IdeaKind } from "../model/types";

export const IDEA_KIND_LABEL: Record<IdeaKind, string> = {
  card: "카드",
  combo: "조합",
  ai: "AI",
  note: "메모",
};

export function ideaKindLabel(kind: IdeaKind): string {
  return IDEA_KIND_LABEL[kind] ?? "메모";
}

/** 최신순 정렬(새 메모가 위). 원본 배열은 건드리지 않는다. */
export function sortIdeas(ideas: readonly Idea[]): Idea[] {
  return [...ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 공백뿐인 메모는 저장하지 않는다. */
export function isValidIdeaText(text: string): boolean {
  return text.trim().length > 0;
}
