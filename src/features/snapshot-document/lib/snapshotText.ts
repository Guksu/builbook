// 스냅샷 목록 표시용 헬퍼. 본문 추출·글자 세기는 @shared/lib의 단일 출처를 쓴다.
// (에디터·검색·내보내기·통계가 모두 같은 규칙을 보게 하기 위해 shared로 내렸다.)

import { extractPlainText } from "@shared/lib";

// 목록에 보여줄 한 줄 미리보기. 개행은 공백으로, 길면 말줄임.
export function buildPreview(content: unknown, maxLen = 140): string {
  const flat = extractPlainText(content).replace(/\n/g, " ").trim();
  if (!flat) return "(빈 문서)";
  return flat.length > maxLen ? `${flat.slice(0, maxLen)}…` : flat;
}

// 증감 표시용 부호 문자열: 12→"+12", -3→"-3", 0→"0".
export function formatSignedDiff(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
