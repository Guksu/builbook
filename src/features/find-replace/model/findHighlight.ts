// 찾기 결과를 본문 위에 표시하는 ProseMirror 계층.
// 순수 계산은 `lib/findMatches`에 있고, 여기서는 "문서 → 텍스트 조각"과 "일치 → Decoration"만 다룬다.
// 마크(굵게 등)로 텍스트 노드가 쪼개져도 문단 단위로 이어 붙여 찾기 때문에, 서식 경계에서 검색이 끊기지 않는다.

import { Extension } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  findMatchesInChunks,
  type DocMatch,
  type FindOptions,
  type TextChunk,
} from "../lib/findMatches";

interface HighlightState {
  matches: DocMatch[];
  /** 현재 보고 있는 일치의 인덱스. 없으면 -1 */
  activeIndex: number;
}

const EMPTY: HighlightState = { matches: [], activeIndex: -1 };

export const findHighlightKey = new PluginKey<HighlightState>("findHighlight");

/**
 * 문서를 문단(텍스트블록) 단위 조각으로 만든다.
 * 조각 안 오프셋은 `pos + 1 + offset`으로 문서 좌표와 1:1 대응한다 —
 * hardBreak처럼 글자가 아닌 인라인 노드는 같은 크기(1)의 공백으로 채워 정렬을 유지한다.
 */
export function collectTextChunks(doc: PMNode): TextChunk[] {
  const chunks: TextChunk[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    node.forEach((child) => {
      text += child.isText ? (child.text ?? "") : " ".repeat(child.nodeSize);
    });
    if (text.length > 0) chunks.push({ text, from: pos + 1 });
    return false; // 텍스트블록 안쪽은 이미 다 읽었다
  });
  return chunks;
}

/** 현재 문서에서 검색어에 맞는 구간을 문서 좌표로 찾는다. */
export function findMatchesInDoc(
  doc: PMNode,
  query: string,
  options: FindOptions = {},
): DocMatch[] {
  return findMatchesInChunks(collectTextChunks(doc), query, options);
}

/** 일치 구간 하이라이트 확장 — 상태는 트랜잭션 meta로만 바뀐다(에디터 바깥에서 주입). */
export const FindHighlight = Extension.create({
  name: "findHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin<HighlightState>({
        key: findHighlightKey,
        state: {
          init: () => EMPTY,
          apply(tr, value) {
            const meta = tr.getMeta(findHighlightKey) as HighlightState | undefined;
            if (meta) return meta;
            if (!tr.docChanged) return value;
            // 글자를 더 쓰면 뒤쪽 좌표가 밀린다 — 다시 계산되기 전까지 매핑으로 따라간다.
            return {
              matches: value.matches.map((m) => ({
                from: tr.mapping.map(m.from),
                to: tr.mapping.map(m.to),
              })),
              activeIndex: value.activeIndex,
            };
          },
        },
        props: {
          decorations(state) {
            const s = findHighlightKey.getState(state);
            if (!s || s.matches.length === 0) return null;
            const decos = s.matches.map((m, i) =>
              Decoration.inline(m.from, m.to, {
                class: i === s.activeIndex ? "find-match find-match--active" : "find-match",
              }),
            );
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

/** 하이라이트 갱신 — 문서를 바꾸지 않는 트랜잭션이라 자동저장을 건드리지 않는다. */
export function setFindHighlight(
  editor: Editor,
  matches: DocMatch[],
  activeIndex: number,
): void {
  if (editor.isDestroyed) return;
  const { state, view } = editor;
  view.dispatch(state.tr.setMeta(findHighlightKey, { matches, activeIndex }));
}

/** 찾기 바를 닫을 때 하이라이트를 지운다. */
export function clearFindHighlight(editor: Editor): void {
  setFindHighlight(editor, [], -1);
}
