"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useState } from "react";
import { useAutosave, SaveStatusBadge, readBackup, clearBackup } from "@features/autosave-document";
import { useFocusSettings, focusStyle, FocusSettingsPanel } from "@features/focus-settings";
import { useToast, cn } from "@shared/ui";
// 분량 규칙 단일 출처(경계면 규약) — 새로 세지 않고 순수 함수를 재사용.
import { measureText, pickCount, formatCount, ZERO_MEASURE, type TextMeasure } from "@shared/lib";
import { useCountUnit } from "@features/count-unit";
import { FindHighlight, FindReplaceBar } from "@features/find-replace";
import { publishSelectionText } from "@features/editor-selection";
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
  /** 집중 모드 — 제목·툴바를 숨기고(hover 시 표시) 타이프라이터 스크롤을 켠다(설정 시). */
  focusMode?: boolean;
}

// Tiptap 에디터 코어. 최소 확장 세트 + 자동저장. 집중 글쓰기 단일 컬럼.
export function Editor({
  documentId,
  projectId,
  initialContent,
  title,
  onMeasureChange,
  onRename,
  focusMode = false,
}: EditorProps) {
  const { status, schedule } = useAutosave(documentId, projectId);
  const [measure, setMeasure] = useState<TextMeasure>(ZERO_MEASURE);
  const [unit] = useCountUnit();
  const [display, setDisplay] = useFocusSettings();
  const [displayOpen, setDisplayOpen] = useState(false);
  const { toast } = useToast();
  const style = focusStyle(display);
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
          "prose-editor min-h-[60vh] outline-none text-fg",
      },
    },
    onUpdate({ editor }) {
      const m = measureText(editor.getText());
      setMeasure(m);
      onMeasureChange?.(m);
      schedule(editor.getJSON(), m);
    },
  });

  // 타이프라이터 스크롤 — 집중 모드 + 설정 켜짐일 때 커서 줄을 스크롤 영역 가운데로.
  useEffect(() => {
    if (!editor || !focusMode || !display.typewriter) return;
    const center = () => {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      const scroller = editor.view.dom.closest("main") as HTMLElement | null;
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const target = rect.top + rect.height / 2;
      scroller.scrollBy({ top: coords.top - target, behavior: "smooth" });
    };
    editor.on("selectionUpdate", center);
    editor.on("update", center);
    return () => {
      editor.off("selectionUpdate", center);
      editor.off("update", center);
    };
  }, [editor, focusMode, display.typewriter]);

  // 선택한 문단을 영감 서랍(AI 탭)이 읽을 수 있게 알린다. 문서를 떠나면 비운다.
  useEffect(() => {
    if (!editor) return;
    const publish = () => {
      const { from, to, empty } = editor.state.selection;
      publishSelectionText(empty ? "" : editor.state.doc.textBetween(from, to, "\n"));
    };
    editor.on("selectionUpdate", publish);
    editor.on("blur", publish);
    return () => {
      editor.off("selectionUpdate", publish);
      editor.off("blur", publish);
      publishSelectionText("");
    };
  }, [editor]);

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

  // 탭이 닫히기 전 미저장 본문이 localStorage에 남아 있으면 되살린다(자동저장 pagehide 백업).
  useEffect(() => {
    if (!editor) return;
    const backup = readBackup(documentId);
    if (!backup) return;
    clearBackup(documentId);
    if (JSON.stringify(backup.content) === JSON.stringify(initialContent)) return; // 이미 저장된 상태
    editor.commands.setContent(backup.content as JSONContent);
    const m = measureText(editor.getText());
    setMeasure(m);
    onMeasureChange?.(m);
    schedule(editor.getJSON(), m);
    toast("닫기 전에 저장되지 않았던 내용을 되살렸어요.", "success");
    // documentId·editor가 바뀔 때만(백업은 문서마다 한 번).
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
    <div
      className={cn(
        "group/editor mx-auto flex h-full w-full flex-col px-24 py-16 max-sm:px-16",
        focusMode && display.typewriter && "pb-[50vh]",
      )}
      style={{ maxWidth: style.maxWidth }}
    >
      {/* 집중 모드: 제목·툴바는 마우스를 올릴 때만 나타난다 — 화면에 글만 남긴다 */}
      <div
        className={cn(
          "transition-opacity",
          focusMode && "opacity-0 focus-within:opacity-100 group-hover/editor:opacity-100",
        )}
      >
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
          displayOpen={displayOpen}
          onToggleDisplay={() => setDisplayOpen((v) => !v)}
        />
      )}

      {editor && findOpen && (
        <FindReplaceBar editor={editor} onClose={() => setFindOpen(false)} />
      )}

      {displayOpen && (
        <div className="mb-12 rounded-md border border-border bg-surface p-12">
          <FocusSettingsPanel settings={display} onChange={setDisplay} showTypewriter={focusMode} />
        </div>
      )}
      </div>

      <EditorContent
        editor={editor}
        className="flex-1"
        style={
          {
            "--editor-font-size": style.fontSize,
            "--editor-line-height": String(style.lineHeight),
          } as React.CSSProperties
        }
      />

      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
