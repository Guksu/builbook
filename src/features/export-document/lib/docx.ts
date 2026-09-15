// DOCX 내보내기 — 순수 변환(ProseMirror JSON → docx 문서 객체). 파일 저장은 download.ts.
// 연재 플랫폼·출판사 투고는 .docx를 받는 곳이 많다. 서식은 최소(제목 + 문단)로 두어
// 어느 편집기에서 열어도 깨지지 않게 한다.

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { DocumentNode } from "@entities/document";
import { flattenTree, selectActiveDocuments } from "@entities/document";
import { extractPlainText } from "@shared/lib";

export interface DocxSection {
  /** 제목 깊이: 0=작품 제목, 1=1단계 문서·폴더, 2=그 아래… */
  level: number;
  title: string;
  paragraphs: string[];
}

const HEADING: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  0: HeadingLevel.TITLE,
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
};

// 본문 평문을 문단 배열로. 빈 줄은 버린다(플랫폼 편집기에서 문단 간격은 따로 준다).
export function toDocxParagraphs(content: unknown): string[] {
  return extractPlainText(content)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function documentToSections(doc: DocumentNode): DocxSection[] {
  return [{ level: 1, title: doc.title, paragraphs: toDocxParagraphs(doc.content) }];
}

export function projectToSections(
  projectTitle: string,
  docs: readonly DocumentNode[],
): DocxSection[] {
  const out: DocxSection[] = [{ level: 0, title: projectTitle, paragraphs: [] }];
  for (const { node, depth } of flattenTree(selectActiveDocuments(docs))) {
    out.push({
      level: Math.min(depth + 1, 3),
      title: node.title,
      paragraphs: node.type === "DOC" ? toDocxParagraphs(node.content) : [],
    });
  }
  return out;
}

export function buildDocx(sections: readonly DocxSection[]): Document {
  const children: Paragraph[] = [];
  for (const s of sections) {
    children.push(
      new Paragraph({
        heading: HEADING[Math.min(s.level, 3)] ?? HeadingLevel.HEADING_3,
        children: [new TextRun(s.title)],
      }),
    );
    for (const p of s.paragraphs) {
      children.push(new Paragraph({ children: [new TextRun(p)], spacing: { after: 160 } }));
    }
  }
  return new Document({
    creator: "builbook",
    styles: {
      default: {
        document: { run: { font: "Malgun Gothic", size: 22 } }, // 11pt — 한글 기본 글꼴 계열
      },
    },
    sections: [{ children }],
  });
}

/** 브라우저에서 Blob으로 — 저장은 downloadBlob이 맡는다. */
export function packDocxBlob(doc: Document): Promise<Blob> {
  return Packer.toBlob(doc);
}

/** 테스트·Node용. */
export function packDocxBuffer(doc: Document): Promise<Uint8Array> {
  return Packer.toBuffer(doc);
}
