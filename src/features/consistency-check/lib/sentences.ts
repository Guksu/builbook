// 문장 진단 — 순수 함수.
// 맞춤법 검사가 아니라 '리듬' 점검이다. 웹소설에서 읽기 힘든 원고는 대개 맞춤법이 아니라
// 긴 문장이 몰려 있거나, 같은 어미가 연달아 반복되거나, 지문만 길게 이어질 때 생긴다.

import { countChars, extractPlainText } from "@shared/lib";

/** 이보다 긴 문장은 '긴 문장'으로 센다(공백 제외 글자 수). */
export const LONG_SENTENCE_CHARS = 60;
/** 같은 어미가 이만큼 연달아 나오면 반복으로 본다. */
export const ENDING_RUN_THRESHOLD = 3;

/** 문장 분리: 마침표·물음표·느낌표·말줄임표·개행 기준. 따옴표는 문장을 끊지 않는다. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const DIALOGUE_START = /^["“'‘「『]/;
export const isDialogueLine = (line: string) => DIALOGUE_START.test(line.trim());

/** 문장 끝 어미 2~3음절을 뽑는다("돌아섰다." → "섰다"). 종결부호·따옴표는 떼고 본다. */
export function endingOf(sentence: string): string {
  const cleaned = sentence.replace(/["“”'‘’「」『』.!?…\s]+$/g, "");
  return cleaned.slice(-2);
}

export interface EndingRun {
  ending: string;
  count: number;
  /** 반복이 시작된 문장 번호(1부터). */
  from: number;
}

/** 같은 어미가 연달아 N회 이상 나온 구간. 지문의 단조로움을 잡아낸다. */
export function findEndingRuns(
  sentences: readonly string[],
  threshold = ENDING_RUN_THRESHOLD,
): EndingRun[] {
  const runs: EndingRun[] = [];
  let current = "";
  let start = 0;
  let count = 0;
  const flush = () => {
    if (count >= threshold && current) {
      runs.push({ ending: current, count, from: start + 1 });
    }
  };
  sentences.forEach((sentence, i) => {
    const ending = endingOf(sentence);
    if (ending && ending === current) {
      count++;
      return;
    }
    flush();
    current = ending;
    start = i;
    count = ending ? 1 : 0;
  });
  flush();
  return runs;
}

export interface RepeatedWord {
  word: string;
  count: number;
}

const WORD_RE = /[가-힣]{2,}|[A-Za-z]{3,}/g;

/**
 * 과하게 반복된 낱말. 조사가 붙어 형태가 갈리므로 앞 2음절로 묶어 대략만 본다
 * (형태소 분석기 없이 브라우저에서 돌려야 하므로 정밀도보다 신호를 택했다).
 */
export function findRepeatedWords(
  text: string,
  minCount = 5,
  limit = 10,
): RepeatedWord[] {
  const counts = new Map<string, number>();
  for (const word of text.match(WORD_RE) ?? []) {
    const stem = word.slice(0, 2);
    counts.set(stem, (counts.get(stem) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export interface SentenceReport {
  sentences: number;
  averageChars: number;
  longest: { text: string; chars: number } | null;
  longCount: number;
  /** 대사 줄 비율 %(문단 기준). */
  dialogueRatio: number;
  endingRuns: EndingRun[];
  repeatedWords: RepeatedWord[];
}

const EMPTY_REPORT: SentenceReport = {
  sentences: 0,
  averageChars: 0,
  longest: null,
  longCount: 0,
  dialogueRatio: 0,
  endingRuns: [],
  repeatedWords: [],
};

/** 문서 하나(ProseMirror content)의 문장 리듬 리포트. */
export function analyzeSentences(content: unknown): SentenceReport {
  const text = extractPlainText(content);
  if (!text.trim()) return EMPTY_REPORT;

  const lines = text.split("\n").filter((l) => l.trim());
  const sentences = splitSentences(text);
  if (sentences.length === 0) return EMPTY_REPORT;

  const lengths = sentences.map((s) => countChars(s));
  const total = lengths.reduce((sum, n) => sum + n, 0);
  let longestIdx = 0;
  lengths.forEach((n, i) => {
    if (n > lengths[longestIdx]) longestIdx = i;
  });

  return {
    sentences: sentences.length,
    averageChars: Math.round(total / sentences.length),
    longest: { text: sentences[longestIdx], chars: lengths[longestIdx] },
    longCount: lengths.filter((n) => n > LONG_SENTENCE_CHARS).length,
    dialogueRatio: lines.length
      ? Math.round((lines.filter(isDialogueLine).length / lines.length) * 100)
      : 0,
    endingRuns: findEndingRuns(sentences),
    repeatedWords: findRepeatedWords(text),
  };
}
