// 내보내기 변환 — 순수 함수(브라우저/DB 비종속). ProseMirror JSON → txt/markdown.
// 평문 추출은 @shared/lib의 단일 출처(extractPlainText)를 재사용한다.

import type { DocumentNode } from "@entities/document";
import { extractPlainText } from "@shared/lib";
import { DEFAULT_COMPILE, SEPARATOR_TEXT, compileManuscript, type CompileOptions } from "./compile";

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

// 작품 전체 → 평문. 컴파일 옵션(범위·구분선·제목 포함)을 compileManuscript가 해석한다.
export function projectToPlainText(
  projectTitle: string,
  docs: readonly DocumentNode[],
  opts: CompileOptions = DEFAULT_COMPILE,
): string {
  const blocks: string[] = [];
  for (const s of compileManuscript(projectTitle, docs, opts)) {
    if (s.separatorBefore) blocks.push(opts.separator === "stars" ? SEPARATOR_TEXT : "");
    if (s.kind !== "episode") {
      blocks.push(s.title);
      continue;
    }
    if (s.title && s.body) blocks.push(`${s.title}\n\n${s.body}`);
    else blocks.push(s.title || s.body);
  }
  return `${blocks.join("\n\n")}\n`;
}

// 작품 전체 → 마크다운. 작품 제목 h1, 노드는 깊이에 따라 h2~h6.
export function projectToMarkdown(
  projectTitle: string,
  docs: readonly DocumentNode[],
  opts: CompileOptions = DEFAULT_COMPILE,
): string {
  const blocks: string[] = [];
  for (const s of compileManuscript(projectTitle, docs, opts)) {
    if (s.separatorBefore) blocks.push(opts.separator === "stars" ? "---" : "");
    if (s.kind === "project") {
      blocks.push(`# ${s.title}`);
      continue;
    }
    const hashes = "#".repeat(Math.min(s.depth + 1, MAX_HEADING));
    const heading = s.title ? `${hashes} ${s.title}` : "";
    if (heading && s.body) blocks.push(`${heading}\n\n${s.body}`);
    else blocks.push(heading || s.body);
  }
  return `${blocks.join("\n\n")}\n`;
}
