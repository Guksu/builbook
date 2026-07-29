// 용어 사전 순수 함수 — 정규화·검증·정렬.

import type { Term, TermCategory } from "../model/types";

export const TERM_CATEGORIES: readonly TermCategory[] = ["PERSON", "PLACE", "TERM"];

const CATEGORY_LABEL: Record<TermCategory, string> = {
  PERSON: "인물",
  PLACE: "지명",
  TERM: "용어",
};

export const termCategoryLabel = (c: TermCategory) => CATEGORY_LABEL[c];

/** 정본 표기는 두 글자 이상이어야 한다 — 한 글자는 본문 어디에나 걸려 검사가 소음이 된다. */
export function isValidTermName(name: string): boolean {
  return name.trim().length >= 2;
}

/** "검은 늑대, 늑대공" 처럼 쉼표/줄바꿈으로 적은 이명을 배열로. 중복·공백·짧은 값 제거. */
export function parseAliases(raw: string): string[] {
  const seen = new Set<string>();
  for (const piece of raw.split(/[,\n]/)) {
    const value = piece.trim();
    if (value.length >= 2) seen.add(value);
  }
  return [...seen];
}

export const formatAliases = (aliases: readonly string[]): string => aliases.join(", ");

/** 이름 가나다순, 같은 이름이면 생성 순(결정적). */
export function sortTerms(terms: readonly Term[]): Term[] {
  return [...terms].sort(
    (a, b) => a.name.localeCompare(b.name, "ko") || a.createdAt.localeCompare(b.createdAt),
  );
}

export function filterTermsByCategory(
  terms: readonly Term[],
  category: TermCategory | "ALL",
): Term[] {
  const sorted = sortTerms(terms);
  return category === "ALL" ? sorted : sorted.filter((t) => t.category === category);
}

/** 한 용어가 인정하는 모든 표기(정본 + 이명). 검사기가 '맞는 표기' 집합으로 쓴다. */
export function acceptedSpellings(term: Term): string[] {
  return [term.name, ...term.aliases].map((s) => s.trim()).filter(Boolean);
}
