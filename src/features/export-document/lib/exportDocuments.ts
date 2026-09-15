// 내보내기 변환 — 순수 함수(브라우저/DB 비종속). ProseMirror JSON → txt/markdown.
// 평문 추출은 @shared/lib의 단일 출처(extractPlainText)를 재사용한다.

import type { DocumentNode } from "@entities/document";
import { selectActiveDocuments, flattenTree, isManuscript } from "@entities/document";
import { extractPlainText } from "@shared/lib";

// 마크다운 헤딩 최대 깊이(h6). 트리가 깊어도 ###### 이상은 만들지 않는다.
const MAX_HEADING = 6;

// 파일명에 못 쓰는 문자 정리 + 길이 제한. 확장자는 호출부가 붙인다.
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, "").trim();
  return (cleaned || "무제").slice(0, 80);
}

// 단일 문서 → 평문(제목 + 본문). 본문이 비면 제목만.
export function documentToPlainText(doc: DocumentNode): string {
  const body = extractPlainText(doc.content);
  return body ? `${doc.title}\n\n${body}\n` : `${doc.title}\n`;
}

// 단일 문서 → 마크다운(제목 h1 + 본문).
export function documentToMarkdown(doc: DocumentNode): string {
  const body = extractPlainText(doc.content);
  return body ? `# ${doc.title}\n\n${body}\n` : `# ${doc.title}\n`;
}

// 작품 전체 → 평문. 트리 순서로 제목·본문을 이어 붙인다(휴지통 제외).
export function projectToPlainText(
  projectTitle: string,
  docs: readonly DocumentNode[],
): string {
  const flat = flattenTree(selectActiveDocuments(docs));
  const blocks = [projectTitle];
  for (const { node } of flat) {
    if (node.type === "DOC" && !isManuscript(node)) continue; // 인물·설정 카드는 원고가 아니다
    const body = node.type === "DOC" ? extractPlainText(node.content) : "";
    blocks.push(body ? `${node.title}\n\n${body}` : node.title);
  }
  return `${blocks.join("\n\n")}\n`;
}

// 작품 전체 → 마크다운. 작품 제목 h1, 노드는 깊이에 따라 h2~h6.
export function projectToMarkdown(
  projectTitle: string,
  docs: readonly DocumentNode[],
): string {
  const flat = flattenTree(selectActiveDocuments(docs));
  const blocks = [`# ${projectTitle}`];
  for (const { node, depth } of flat) {
    if (node.type === "DOC" && !isManuscript(node)) continue;
    const hashes = "#".repeat(Math.min(depth + 2, MAX_HEADING));
    const heading = `${hashes} ${node.title}`;
    const body = node.type === "DOC" ? extractPlainText(node.content) : "";
    blocks.push(body ? `${heading}\n\n${body}` : heading);
  }
  return `${blocks.join("\n\n")}\n`;
}
