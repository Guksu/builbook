// AI에 보낼 작품 맥락 — "무엇을 보내는지"를 작가가 미리 보게 하려면 먼저 텍스트로 확정해야 한다.
// 상한을 두어 회차 하나가 통째로 나가는 일이 없게 한다(끝부분 우선: 다음 전개는 끝이 중요).
import { extractPlainText } from "@shared/lib";
import type { DocumentNode } from "@entities/document";

export const MAX_BODY_CHARS = 8000;
export const MAX_SIDE_CHARS = 1000;

export interface Truncated {
  text: string;
  truncated: boolean;
}

/** 끝에서 max자만 남긴다(앞을 자른다). 자른 경우 앞에 표식을 붙인다. */
export function tailTruncate(text: string, max: number): Truncated {
  const t = text.trim();
  if (t.length <= max) return { text: t, truncated: false };
  return { text: `…(앞부분 생략)\n${t.slice(t.length - max)}`, truncated: true };
}

/** 앞에서 max자만 남긴다(뒤를 자른다). 인물·설정 카드는 앞이 중요하다. */
export function headTruncate(text: string, max: number): Truncated {
  const t = text.trim();
  if (t.length <= max) return { text: t, truncated: false };
  return { text: `${t.slice(0, max)}\n…(뒷부분 생략)`, truncated: true };
}

export interface AiContext {
  projectTitle: string;
  /** 본문(선택 문단 또는 현재 회차). */
  body: string;
  bodySource: "selection" | "document" | "none";
  bodyTruncated: boolean;
  documentTitle: string;
  synopsis: string;
  /** "이름: 카드 내용" 묶음(인물 카드). */
  characters: string;
  settings: string;
}

export interface ContextInput {
  projectTitle: string;
  doc: DocumentNode | null;
  selectionText: string;
  /** 바인더의 인물 카드·설정 카드 문서(kind 기준). */
  characterDocs: readonly DocumentNode[];
  settingDocs: readonly DocumentNode[];
}

function cardsToText(docs: readonly DocumentNode[], max: number): string {
  const lines = docs.map((d) => {
    const body = headTruncate(extractPlainText(d.content), 300).text;
    return body ? `- ${d.title}: ${body.replace(/\n+/g, " / ")}` : `- ${d.title}`;
  });
  return headTruncate(lines.join("\n"), max).text;
}

export function buildContext(input: ContextInput): AiContext {
  const { doc, selectionText } = input;
  const selection = selectionText.trim();
  let body = "";
  let bodySource: AiContext["bodySource"] = "none";
  let bodyTruncated = false;
  if (selection) {
    const t = tailTruncate(selection, MAX_BODY_CHARS);
    body = t.text;
    bodySource = "selection";
    bodyTruncated = t.truncated;
  } else if (doc && doc.type === "DOC") {
    const t = tailTruncate(extractPlainText(doc.content), MAX_BODY_CHARS);
    body = t.text;
    bodySource = t.text ? "document" : "none";
    bodyTruncated = t.truncated;
  }
  return {
    projectTitle: input.projectTitle,
    body,
    bodySource,
    bodyTruncated,
    documentTitle: doc?.title ?? "",
    synopsis: headTruncate(doc?.synopsis ?? "", MAX_SIDE_CHARS).text,
    characters: cardsToText(input.characterDocs, MAX_SIDE_CHARS),
    settings: cardsToText(input.settingDocs, MAX_SIDE_CHARS),
  };
}
