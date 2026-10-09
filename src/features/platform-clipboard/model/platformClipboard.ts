"use client";

// 복사·붙여넣기 줄 규칙 — 연재처(노벨피아·문피아·네이버 시리즈) 입력창 기준.
//
// 에디터 기본 복사는 문단 사이를 "\n\n"으로 잇고(prosemirror-view serializeForClipboard)
// 문단마다 <p>가 든 HTML도 함께 넣는다. 연재처에 붙이면 Enter 한 번이 빈 줄 낀 두 줄이 됐다(2026-10).
// 그래서 밖으로는 "글자와 줄바꿈"만(문단 하나 = 한 줄, 빈 문단 = 빈 줄 하나) 넘기고,
// 우리 에디터끼리는 서식(굵게 등)이 남도록 문서 조각을 전용 형식으로 함께 넣는다(사용자 결정).

import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { splitPlainLines, toPlainLines } from "@shared/lib";

/** 우리 에디터끼리만 읽는 클립보드 형식 — 서식이 든 문서 조각(ProseMirror Slice JSON). */
export const BUILBOOK_SLICE_MIME = "application/x-builbook-slice+json";

export function sliceToPlainLines(slice: Slice): string {
  return toPlainLines(slice.content.toJSON());
}

function writeClipboard(view: EditorView, event: ClipboardEvent): boolean {
  const data = event.clipboardData;
  const { selection } = view.state;
  if (!data || selection.empty) return false;
  const slice = selection.content();
  data.clearData();
  data.setData("text/plain", sliceToPlainLines(slice));
  data.setData(BUILBOOK_SLICE_MIME, JSON.stringify(slice.toJSON()));
  event.preventDefault();
  if (event.type === "cut" && view.editable) {
    view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
  }
  return true;
}

export const PlatformClipboard = Extension.create({
  name: "platformClipboard",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("platformClipboard"),
        props: {
          // 끌어서 옮기기처럼 기본 직렬화를 쓰는 경로에도 같은 줄 규칙을 쓴다.
          clipboardTextSerializer: (slice) => sliceToPlainLines(slice),
          // 평문 붙여넣기: 줄 하나 = 문단 하나, 빈 줄은 빈 문단으로 남긴다(기본은 연속 줄바꿈을 접는다).
          clipboardTextParser: (text, $context, _plain, view) => {
            const { schema } = view.state;
            const marks = $context.marks();
            const paragraphs = splitPlainLines(text).map((line) =>
              schema.nodes.paragraph.create(null, line ? schema.text(line, marks) : null),
            );
            return Slice.maxOpen(Fragment.from(paragraphs));
          },
          // 복사·잘라내기: 기본 처리(HTML + "\n\n" 평문) 대신 연재처 줄 규칙 평문 + 전용 조각.
          handleDOMEvents: {
            copy: (view, event) => writeClipboard(view, event),
            cut: (view, event) => writeClipboard(view, event),
          },
          // 우리 에디터에서 복사한 조각이면 서식째 넣는다(없으면 기본 붙여넣기 → 위 평문 규칙).
          handlePaste: (view, event) => {
            const raw = event.clipboardData?.getData(BUILBOOK_SLICE_MIME);
            if (!raw) return false;
            try {
              const slice = Slice.fromJSON(view.state.schema, JSON.parse(raw));
              view.dispatch(
                view.state.tr.replaceSelection(slice).scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"),
              );
              return true;
            } catch {
              return false; // 다른 에디터 버전 등으로 못 읽으면 평문 붙여넣기로
            }
          },
        },
      }),
    ];
  },
});
