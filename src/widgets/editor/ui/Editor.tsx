"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { useAutosave, SaveStatusBadge } from "@features/autosave-document";
import type { JSONContent } from "@tiptap/react";

// 단어 수: 텍스트를 공백 기준으로 셈(한글/영문 혼용 근사치).
function countWords(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

interface EditorProps {
  documentId: string;
  initialContent: JSONContent | null;
  title: string;
}

// Tiptap 에디터 코어. 최소 확장 세트 + 자동저장. 집중 글쓰기 단일 컬럼.
export function Editor({ documentId, initialContent, title }: EditorProps) {
  const { status, schedule } = useAutosave(documentId);

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
      schedule(editor.getJSON(), countWords(editor.getText()));
    },
  });

  // 문서 전환 시 content 교체.
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
    // documentId 변경 시에만 — initialContent는 그 시점 값 사용.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col px-24 py-16">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-h3 text-fg">{title}</h1>
        <SaveStatusBadge status={status} />
      </header>
      <EditorContent editor={editor} className="flex-1" />
    </div>
  );
}
