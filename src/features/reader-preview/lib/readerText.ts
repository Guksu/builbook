// 독자 뷰 변환 — 순수 함수.
// 집필 화면과 독자가 보는 화면은 다르다. 폭이 좁고, 문단 사이가 벌어지고, 글자가 크다.
// 그 차이 때문에 "쓸 때는 괜찮았는데 읽으면 답답한" 문단이 드러난다.

import { countChars, countCharsWithSpaces, extractPlainText } from "@shared/lib";

/** 한국어 평균 읽기 속도(자/분, 공백 제외). 연재 회차 예상 읽기 시간 계산용. */
export const READING_CHARS_PER_MINUTE = 600;

/** ProseMirror content → 문단 배열(빈 줄 제거). 독자 뷰가 그대로 렌더한다. */
export function toParagraphs(content: unknown): string[] {
  return extractPlainText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export interface ReaderStats {
  paragraphs: number;
  chars: number;
  charsWithSpaces: number;
  /** 예상 읽기 시간(분, 최소 1). 내용이 없으면 0. */
  minutes: number;
  /** 대사(따옴표로 시작하는 문단) 비율 %. 내용이 없으면 0. */
  dialogueRatio: number;
}

// 큰따옴표류로 시작하면 대사 문단으로 본다(한국 웹소설의 지문/대사 리듬 점검용).
const DIALOGUE_START = /^["“'‘「『]/;

export function isDialogue(paragraph: string): boolean {
  return DIALOGUE_START.test(paragraph.trim());
}

export function readerStats(content: unknown): ReaderStats {
  const paragraphs = toParagraphs(content);
  const text = paragraphs.join("\n");
  const chars = countChars(text);
  const dialogue = paragraphs.filter(isDialogue).length;
  return {
    paragraphs: paragraphs.length,
    chars,
    charsWithSpaces: countCharsWithSpaces(text),
    minutes: chars ? Math.max(1, Math.round(chars / READING_CHARS_PER_MINUTE)) : 0,
    dialogueRatio: paragraphs.length
      ? Math.round((dialogue / paragraphs.length) * 100)
      : 0,
  };
}
