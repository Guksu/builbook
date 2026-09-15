"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useState } from "react";
import { useAutosave, SaveStatusBadge } from "@features/autosave-document";
// 분량 규칙 단일 출처(경계면 규약) — 새로 세지 않고 순수 함수를 재사용.
import { measureText, pickCount, formatCount, ZERO_MEASURE, type TextMeasure } from "@shared/lib";
import { useCountUnit } from "@features/count-unit";
import { FindHighlight, FindReplaceBar } from "@features/find-replace";
import type { JSONContent } from "@tiptap/react";
import { EditorShortcuts } from "../lib/editorShortcuts";
import { EditorToolbar } from "./EditorToolbar";
import { ShortcutHelp } from "./ShortcutHelp";
import { TitleField } from "./TitleField";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// 빈 문서에서 첫 문장을 막는 건 '무엇을 써야 하나'가 아니라 '여기 써도 되나'다.
const PLACEHOLDER = "여기에 첫 문장을 쓰세요. 저장은 자동이에요.";

interface EditorProps {
  documentId: string;
  projectId: string;
  initialContent: JSONContent | null;
  title: string;
  /** 실시간 분량(단어·글자)을 상위(작업실)로 올려 목표·집중모드 카운터에 공유한다. */
  onMeasureChange?: (measure: TextMeasure) => void;
  /** 제목 인라인 수정 — 없으면 제목은 읽기 전용 */
  onRename?: (title: string) => void;
}

// Tiptap 에디터 코어. 최소 확장 세트 + 자동저장. 집중 글쓰기 단일 컬럼.
export function Editor({
  documentId,
  projectId,
  initialContent,
  title,
  onMeasureChange,
  onRename,
}: EditorProps) {
  const { status, schedule } = useAutosave(documentId, projectId);
  const [measure, setMeasure] = useState<TextMeasure>(ZERO_MEASURE);
  const [unit] = useCountUnit();
  const [findOpen, setFindOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // 값이 바뀔 때마다 제목 편집이 시작된다(F2). 상태 대신 신호로 두면 되돌릴 필요가 없다.
  const [titleEditSignal, setTitleEditSignal] = useState(0);

  // useEditor는 생성 시점의 extensions만 읽으므로 콜백이 매 렌더 바뀌지 않게 고정한다.
  const openFind = useCallback(() => setFindOpen(true), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: PLACEHOLDER }),
      FindHighlight,
      EditorShortcuts.configure({ onFind: openFind }),
    ],
    content: initialContent ?? EMPTY_DOC,
    immediatelyRender: false, // SSR hydration 안전
    editorProps: {
      attributes: {
        class:
          "prose-editor min-h-[60vh] outline-none text-body leading-relaxed text-fg",
      },
    },
    onUpdate({ editor }) {
      const m = measureText(editor.getText());
      setMeasure(m);
      onMeasureChange?.(m);
      schedule(editor.getJSON(), m);
    },
  });

  // 문서 전환 시 content 교체 + 단어 수 초기화.
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
    if (editor) {
      const m = measureText(editor.getText());
      setMeasure(m);
      onMeasureChange?.(m);
    }
    // documentId 변경 시에만 — initialContent는 그 시점 값 사용.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, editor]);

  // F2 = 제목 편집. 브라우저 기본 동작이 없는 키라 문서 어디서 눌러도 안전하지만,
  // 다른 입력칸에 글을 치는 중이라면 가만히 둔다.
  useEffect(() => {
    if (!onRename) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F2") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
      setTitleEditSignal((n) => n + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRename]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col px-24 py-16">
      <header className="mb-12 flex items-center justify-between gap-12">
        <div className="min-w-0 flex-1">
          <TitleField title={title} onRename={onRename} editSignal={titleEditSignal} />
        </div>
        <div className="flex shrink-0 items-center gap-12">
          <span className="text-caption tabular-nums text-fg-weak">
            {formatCount(pickCount(measure, unit), unit)}
          </span>
          <SaveStatusBadge status={status} />
        </div>
      </header>

      {editor && (
        <EditorToolbar
          editor={editor}
          findOpen={findOpen}
          onOpenFind={() => setFindOpen((v) => !v)}
          onOpenHelp={() => setHelpOpen(true)}
        />
      )}

      {editor && findOpen && (
        <FindReplaceBar editor={editor} onClose={() => setFindOpen(false)} />
      )}

      <EditorContent editor={editor} className="flex-1" />

      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
