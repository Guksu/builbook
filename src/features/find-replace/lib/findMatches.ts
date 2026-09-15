// 찾기·바꾸기 순수 로직 — ProseMirror에 의존하지 않는 부분만 모은다.
// 에디터(뷰)와 분리해 두면 경계(문자열 오프셋 ↔ 문서 좌표) 계산을 단위 테스트로 못 박을 수 있다.
// 규칙: 겹치지 않는 일치만 반환하고, 문서 안 순서(앞→뒤)를 유지한다.

export interface FindOptions {
  /** 대소문자 구분 (기본 false — 한글엔 무의미하지만 영문 고유명사 검색에 쓰인다) */
  caseSensitive?: boolean;
}

/** 텍스트 조각 하나 — `from`은 이 조각의 첫 글자가 놓인 문서 좌표. */
export interface TextChunk {
  text: string;
  from: number;
}

/** 문서 좌표로 표현한 일치 구간 (ProseMirror의 from/to와 같은 의미). */
export interface DocMatch {
  from: number;
  to: number;
}

/** 문자열 안의 일치 구간 — [start, end) 오프셋. */
export interface TextMatch {
  start: number;
  end: number;
}

/**
 * 한 문자열에서 검색어가 나오는 자리를 모두 찾는다.
 * 정규식이 아니라 단순 부분 문자열 비교 — 작가가 특수문자를 그대로 검색할 수 있어야 한다.
 */
export function findMatches(
  text: string,
  query: string,
  options: FindOptions = {},
): TextMatch[] {
  if (!query) return [];
  const haystack = options.caseSensitive ? text : text.toLowerCase();
  const needle = options.caseSensitive ? query : query.toLowerCase();
  const out: TextMatch[] = [];
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    out.push({ start: i, end: i + needle.length });
    // 겹치는 일치는 세지 않는다("aaa"에서 "aa"는 1건).
    i = haystack.indexOf(needle, i + needle.length);
  }
  return out;
}

/**
 * 조각 목록에서 일치를 찾아 문서 좌표로 바꾼다.
 * 조각 = 텍스트블록(문단 등) 하나. 문단을 넘어가는 일치는 찾지 않는다 —
 * 에디터에서 그런 구간은 하나의 트랜잭션으로 안전하게 바꾸기 어렵다.
 */
export function findMatchesInChunks(
  chunks: readonly TextChunk[],
  query: string,
  options: FindOptions = {},
): DocMatch[] {
  const out: DocMatch[] = [];
  for (const chunk of chunks) {
    for (const m of findMatches(chunk.text, query, options)) {
      out.push({ from: chunk.from + m.start, to: chunk.from + m.end });
    }
  }
  return out;
}

/**
 * 다음/이전 일치의 인덱스 — 끝에서 다시 처음으로 돈다(브라우저 찾기와 같은 감각).
 * 일치가 없으면 -1.
 */
export function stepMatchIndex(
  total: number,
  current: number,
  direction: 1 | -1,
): number {
  if (total <= 0) return -1;
  const base = current < 0 ? 0 : current;
  return (base + direction + total) % total;
}

/**
 * 모두 바꾸기 실행 순서 — 뒤에서부터 바꾼다.
 * 앞에서부터 바꾸면 길이가 달라지는 순간 뒤쪽 좌표가 전부 어긋난다.
 */
export function planReplaceAll(matches: readonly DocMatch[]): DocMatch[] {
  return [...matches].sort((a, b) => b.from - a.from);
}

/** 문자열 단위 모두 바꾸기 — 조각 계산이 맞는지 테스트로 대조하는 기준값. */
export function replaceAllInText(
  text: string,
  query: string,
  replacement: string,
  options: FindOptions = {},
): string {
  const matches = findMatches(text, query, options);
  if (matches.length === 0) return text;
  let out = "";
  let cursor = 0;
  for (const m of matches) {
    out += text.slice(cursor, m.start) + replacement;
    cursor = m.end;
  }
  return out + text.slice(cursor);
}
