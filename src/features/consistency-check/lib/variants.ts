// 표기 흔들림 검사 — 순수 함수.
// 사전에 등록한 정본 표기를 기준으로 본문을 훑어, "거의 같지만 다른" 표기를 찾아낸다.
// 완전 자동 교정은 하지 않는다 — 일부러 다르게 쓴 경우(별명·오탈자 연출)를 지울 수 없기 때문에
// "여기 이렇게 적혀 있다"까지만 알려주고 판단은 작가에게 남긴다.

import type { Term } from "@entities/term";
import { acceptedSpellings } from "@entities/term";
import { extractPlainText } from "@shared/lib";

/** 한글·영문·숫자 덩어리만 뽑는다(문장부호·공백은 경계). */
const TOKEN_RE = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]+/g;

export function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

/**
 * 편집 거리(삽입·삭제·교체). 최대 허용치를 넘어서면 조기에 포기해 긴 단어 비교를 아낀다.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) return max + 1; // 이 행 전체가 이미 한도를 넘었다
    prev = curr;
  }
  return prev[b.length];
}

/**
 * 토큰이 이 표기를 '제대로 쓴 것'인가.
 * 한국어는 조사가 붙으므로("테아르가", "테아르는") 표기로 시작하면 맞게 쓴 것으로 본다.
 */
export function isCorrectUse(token: string, spelling: string): boolean {
  return token === spelling || token.startsWith(spelling);
}

export interface VariantHit {
  termId: string;
  /** 정본 표기. */
  term: string;
  /** 본문에서 발견된 흔들린 표기. */
  found: string;
  count: number;
  /** 이 표기가 나온 문서 제목들(중복 없이). */
  documents: string[];
}

export interface TermUsage {
  termId: string;
  term: string;
  /** 정본·이명을 통틀어 제대로 쓰인 횟수. */
  count: number;
}

export interface ConsistencyReport {
  usages: TermUsage[];
  variants: VariantHit[];
  /** 검사한 본문 문서 수. */
  scanned: number;
}

interface ScanDoc {
  id: string;
  title: string;
  text: string;
}

/** 표기 길이에 따른 허용 오차 — 짧은 이름일수록 엄격해야 오탐이 줄어든다. */
function toleranceFor(spelling: string): number {
  if (spelling.length <= 2) return 1;
  if (spelling.length <= 5) return 1;
  return 2;
}

/**
 * 본문 전체를 훑어 용어별 사용 횟수와 흔들린 표기 목록을 만든다.
 * 판정 순서가 중요하다: 먼저 '맞게 쓴 표기'를 걸러내고, 남은 토큰만 유사도로 비교한다.
 * (그러지 않으면 "테아르"가 자기 자신과 비슷하다고 잡힌다.)
 */
export function analyzeTerms(
  docs: readonly ScanDoc[],
  terms: readonly Term[],
): ConsistencyReport {
  const usage = new Map<string, number>();
  const variants = new Map<string, VariantHit>();
  const spellingsByTerm = terms.map((term) => ({
    term,
    spellings: acceptedSpellings(term),
  }));

  for (const doc of docs) {
    for (const token of tokenize(doc.text)) {
      // 1) 이 토큰이 어느 용어든 제대로 쓴 것이면 사용 횟수만 올리고 끝낸다.
      //    (다른 용어의 정본을 자기 흔들림으로 착각하는 걸 여기서 막는다 — 테아르 vs 테아론)
      let correct = false;
      for (const { term, spellings } of spellingsByTerm) {
        if (spellings.some((s) => isCorrectUse(token, s))) {
          usage.set(term.id, (usage.get(term.id) ?? 0) + 1);
          correct = true;
        }
      }
      if (correct) continue;

      // 2) 아니면 정본과 얼마나 비슷한가.
      for (const { term } of spellingsByTerm) {
        const tolerance = toleranceFor(term.name);
        // 조사가 붙은 흔들림("테아리가")을 잡으려면 앞부분만 떼어 비교해야 한다.
        // 뒤에 붙을 수 있는 조사는 길어야 세 글자로 본다("에서는", "으로는").
        if (token.length < term.name.length - tolerance) continue;
        if (token.length > term.name.length + 3) continue;
        const head = token.slice(0, term.name.length);
        if (editDistance(head, term.name, tolerance) > tolerance) continue;

        // 조사를 뗀 표기로 묶는다 — "테아리가/테아리는/테아리도"는 같은 흔들림 하나다.
        const key = `${term.id}:${head}`;
        const hit = variants.get(key);
        if (hit) {
          hit.count++;
          if (!hit.documents.includes(doc.title)) hit.documents.push(doc.title);
        } else {
          variants.set(key, {
            termId: term.id,
            term: term.name,
            found: head,
            count: 1,
            documents: [doc.title],
          });
        }
      }
    }
  }

  return {
    scanned: docs.length,
    usages: terms.map((t) => ({
      termId: t.id,
      term: t.name,
      count: usage.get(t.id) ?? 0,
    })),
    // 많이 흔들린 표기부터 — 고칠 가치가 큰 순서.
    variants: [...variants.values()].sort((a, b) => b.count - a.count),
  };
}

/** 문서 목록(ProseMirror content)을 검사 입력 형태로 바꾼다. */
export function toScanDocs(
  docs: readonly { id: string; title: string; type: string; content: unknown }[],
): ScanDoc[] {
  return docs
    .filter((d) => d.type === "DOC")
    .map((d) => ({ id: d.id, title: d.title, text: extractPlainText(d.content) }));
}
