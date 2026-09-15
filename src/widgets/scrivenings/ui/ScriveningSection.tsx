"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { useAutosave, SaveStatusBadge } from "@features/autosave-document";
import { useCountUnit } from "@features/count-unit";
import { measureDocument, type DocumentNode } from "@entities/document";
import { measureText, formatCount, pickCount, type TextMeasure } from "@shared/lib";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// 연속 보기에서는 "여기도 쓸 수 있다"만 알리면 된다 — 단일 에디터보다 조용한 문구.
const PLACEHOLDER = "이 회차는 아직 비어 있어요.";

export interface ScriveningSectionProps {
  doc: DocumentNode;
  projectId: string;
  /** 이 회차만 단일 에디터로 연다 */
  onOpen: (id: string) => void;
}

/**
 * 연속 보기의 한 구획 = 한 회차.
 * 툴바·찾기·제목 편집은 두지 않는다. 이어 읽으며 고치는 화면이라, 손댈 곳이 본문뿐이어야
 * 회차 사이를 오갈 때 시선이 끊기지 않는다(세부 편집은 "이 문서만 열기"로 간다).
 */
export function ScriveningSection({ doc, projectId, onOpen }: ScriveningSectionProps) {
  const { status, schedule } = useAutosave(doc.id, projectId);
  const [unit] = useCountUnit();
  const [measure, setMeasure] = useState<TextMeasure>(() => measureDocument(doc));
  // 초기 본문만 쓴다 — 저장 후 목록 캐시가 갱신돼 doc이 새 객체가 돼도 setContent하지 않는다
  // (다시 넣으면 쓰던 자리에서 커서가 튄다).
  const initial = useRef<JSONContent>((doc.content as JSONContent | null) ?? EMPTY_DOC);

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: PLACEHOLDER })],
    content: initial.current,
    immediatelyRender: false, // SSR hydration 안전
    editorProps: {
      attributes: {
        class: "prose-editor min-h-80 outline-none text-body leading-relaxed text-fg",
      },
    },
    onUpdate({ editor }) {
      const m = measureText(editor.getText());
      setMeasure(m);
      schedule(editor.getJSON(), m);
    },
  });

  return (
    <section aria-label={`${doc.title} 구획`} className="flex flex-col gap-8">
      <header className="flex items-baseline justify-between gap-12">
        <h2 className="min-w-0 truncate text-body-lg font-semibold text-fg">{doc.title}</h2>
        <div className="flex shrink-0 items-center gap-12">
          {/* 평소엔 조용히 — 저장 중이거나 실패했을 때만 알린다 */}
          {(status === "saving" || status === "error") && (
            <SaveStatusBadge status={status} />
          )}
          <span className="text-caption tabular-nums text-fg-weak">
            {formatCount(pickCount(measure, unit), unit)}
          </span>
          <button
            type="button"
            onClick={() => onOpen(doc.id)}
            className="rounded-sm text-caption text-fg-weak hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            이 문서만 열기
          </button>
        </div>
      </header>

      <EditorContent editor={editor} />
    </section>
  );
}
