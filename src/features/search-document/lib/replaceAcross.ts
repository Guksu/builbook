// 작품 전체 바꾸기 — 순수 함수(UI/DB 비종속). ProseMirror JSON의 텍스트 노드 안에서만 바꾼다.
// 규칙은 검색 패널·에디터 찾기와 같다: 대소문자 무시, 단순 부분 문자열, 겹치지 않는 일치.
// 굵게 등으로 서식이 갈린 곳(텍스트 노드 두 개에 걸친 일치)은 바꾸지 않는다 — 서식을 깨지 않으려는 선택.

import type { DocumentNode } from "@entities/document";

interface PMNode {
  type?: string;
  text?: string;
  content?: unknown[];
  [key: string]: unknown;
}

/** 한 문자열에서 바꾼 결과와 바꾼 횟수. */
export function replaceInText(text: string, query: string, replacement: string): { text: string; count: number } {
  if (!query) return { text, count: 0 };
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  let out = "";
  let count = 0;
  let from = 0;
  let i = hay.indexOf(needle);
  while (i !== -1) {
    out += text.slice(from, i) + replacement;
    count += 1;
    from = i + needle.length;
    i = hay.indexOf(needle, from);
  }
  return count ? { text: out + text.slice(from), count } : { text, count: 0 };
}

function walk(node: unknown, query: string, replacement: string): { node: unknown; count: number } {
  if (!node || typeof node !== "object") return { node, count: 0 };
  const n = node as PMNode;
  if (n.type === "text" && typeof n.text === "string") {
    const r = replaceInText(n.text, query, replacement);
    return r.count ? { node: { ...n, text: r.text }, count: r.count } : { node, count: 0 };
  }
  if (!Array.isArray(n.content)) return { node, count: 0 };
  let count = 0;
  const content: unknown[] = [];
  for (const child of n.content) {
    const r = walk(child, query, replacement);
    count += r.count;
    // 빈 텍스트 노드는 ProseMirror가 받지 않는다 — 다 지워진 조각은 뺀다.
    const c = r.node as PMNode;
    if (c && c.type === "text" && c.text === "") continue;
    content.push(r.node);
  }
  return count ? { node: { ...n, content }, count } : { node, count: 0 };
}

/** 본문(ProseMirror JSON)에서 바꾼 결과와 바꾼 곳 수. 바꿀 게 없으면 원래 객체 그대로. */
export function replaceInContent(
  content: unknown,
  query: string,
  replacement: string,
): { content: unknown; count: number } {
  if (!query.trim()) return { content, count: 0 };
  const r = walk(content, query, replacement);
  return { content: r.node, count: r.count };
}

export interface ReplacePlanItem {
  id: string;
  title: string;
  count: number;
}

/** 확인창에 보여 줄 "어느 문서에서 몇 곳" — 원고·카드 문서만, 휴지통 제외, 0곳은 뺀다. */
export function planProjectReplace(docs: readonly DocumentNode[], query: string): ReplacePlanItem[] {
  if (!query.trim()) return [];
  const out: ReplacePlanItem[] = [];
  for (const doc of docs) {
    if (doc.type !== "DOC" || doc.trashedAt) continue;
    const { count } = replaceInContent(doc.content, query, "");
    if (count) out.push({ id: doc.id, title: doc.title, count });
  }
  return out;
}
