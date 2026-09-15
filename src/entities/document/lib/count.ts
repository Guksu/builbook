// 문서 분량 — 저장된 수치를 우선 쓰고, 없으면(옛 레코드) 본문에서 다시 센다.
// 단어/글자(공백 포함/제외) 세 수치를 함께 다뤄 단위를 바꿔도 숫자가 즉시 따라온다.

import {
  extractPlainText,
  measureText,
  pickCount,
  ZERO_MEASURE,
  type CountUnit,
  type TextMeasure,
} from "@shared/lib";
import type { DocumentNode } from "../model/types";

export function measureDocument(doc: Pick<DocumentNode, "type" | "content" | "wordCount" | "charCount" | "charCountNoSpace">): TextMeasure {
  if (doc.type !== "DOC") return ZERO_MEASURE;
  // 세 수치가 모두 저장돼 있으면 그대로(자동저장이 measureText로 함께 기록한다).
  if (typeof doc.charCount === "number" && typeof doc.charCountNoSpace === "number") {
    return { words: doc.wordCount ?? 0, chars: doc.charCount, charsNoSpace: doc.charCountNoSpace };
  }
  // 글자 수 도입(2026-09) 이전 레코드 — 본문에서 다시 센다(본문이 없으면 0).
  if (doc.content == null) return { ...ZERO_MEASURE, words: doc.wordCount ?? 0 };
  return measureText(extractPlainText(doc.content));
}

export function docCount(doc: DocumentNode, unit: CountUnit): number {
  return pickCount(measureDocument(doc), unit);
}

// 작품 전체 분량 — DOC만 합산(FOLDER 제외). 휴지통 제외는 호출부가 selectActiveDocuments로.
export function sumDocCounts(docs: readonly DocumentNode[], unit: CountUnit): number {
  return docs.reduce((sum, d) => sum + (d.type === "DOC" ? docCount(d, unit) : 0), 0);
}
