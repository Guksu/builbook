"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { useAutosave, SaveStatusBadge } from "@features/autosave-document";
// 분량 규칙 단일 출처(경계면 규약) — 새로 세지 않고 순수 함수를 재사용.
import { measureText, pickCount, formatCount, ZERO_MEASURE, type TextMeasure } from "@shared/lib";
import { useCountUnit } from "@features/count-unit";
import type { JSONContent } from "@tiptap/react";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

interface EditorProps {
  documentId: string;
  projectId: string;
  initialContent: JSONContent | null;
  title: string;
  /** 실시간 분량(단어·글자)을 상위(작업실)로 올려 목표·집중모드 카운터에 공유한다. */
  onMeasureChange?: (measure: TextMeasure) => void;
}

// Tiptap 에디터 코어. 최소 확장 세트 + 자동저장. 집중 글쓰기 단일 컬럼.
export function Editor({
  documentId,
  projectId,
  initialContent,
  title,
  onMeasureChange,
}: EditorProps) {
  const { status, schedule } = useAutosave(documentId, projectId);
  const [measure, setMeasure] = useState<TextMeasure>(ZERO_MEASURE);
  const [unit] = useCountUnit();

  const editor = useEditor({
    extensions: [StarterKit],
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

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col px-24 py-16">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-h3 text-fg">{title}</h1>
        <div className="flex items-center gap-12">
          <span className="text-caption tabular-nums text-fg-weak">
            {formatCount(pickCount(measure, unit), unit)}
          </span>
          <SaveStatusBadge status={status} />
        </div>
      </header>
      <EditorContent editor={editor} className="flex-1" />
    </div>
  );
}
