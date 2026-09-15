// 찾은 구간을 실제 문서에 반영하는 커맨드. 트랜잭션으로 처리해 되돌리기(Ctrl+Z)와
// 자동저장(onUpdate)이 그대로 따라오게 한다.

import type { Editor } from "@tiptap/react";
import { planReplaceAll, type DocMatch } from "../lib/findMatches";

// 빈 문자열은 텍스트 노드로 만들 수 없다 — "지우기"는 deleteRange로 처리한다.
// 문자열을 그대로 넘기면 Tiptap이 HTML로 파싱하므로, 반드시 text 노드로 감싼다(`<b>` 같은 입력 보호).
function replaceRange(
  chain: ReturnType<Editor["chain"]>,
  range: DocMatch,
  text: string,
) {
  return text
    ? chain.insertContentAt(range, { type: "text", text })
    : chain.deleteRange(range);
}

/** 현재 일치 한 건만 바꾼다. */
export function replaceMatch(editor: Editor, match: DocMatch, text: string): void {
  if (editor.isDestroyed) return;
  replaceRange(editor.chain(), match, text).run();
}

/** 모두 바꾸기 — 뒤에서부터 한 트랜잭션 체인으로 처리해 좌표가 어긋나지 않게 한다. */
export function replaceAllMatches(
  editor: Editor,
  matches: readonly DocMatch[],
  text: string,
): void {
  if (editor.isDestroyed || matches.length === 0) return;
  let chain = editor.chain();
  for (const m of planReplaceAll(matches)) {
    chain = replaceRange(chain, m, text);
  }
  chain.run();
}
