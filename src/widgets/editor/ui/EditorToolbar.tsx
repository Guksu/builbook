"use client";

import type { Editor } from "@tiptap/react";
import { cn } from "@shared/ui";
import { useModLabel } from "../lib/platform";

export interface EditorToolbarProps {
  editor: Editor;
  /** 찾기·바꾸기 바 열기 */
  onOpenFind: () => void;
  /** 단축키 도움말 열기 */
  onOpenHelp: () => void;
  /** 찾기 바가 열려 있는지 — 버튼 눌림 상태 표시용 */
  findOpen: boolean;
  /** 본문 표시 설정(글자 크기·줄 간격·폭) 패널 토글 */
  onToggleDisplay?: () => void;
  displayOpen?: boolean;
}

const buttonClass =
  "flex h-32 min-w-[32px] items-center justify-center rounded-md px-8 text-body-sm " +
  "text-fg-weak transition-colors hover:bg-surface hover:text-fg " +
  "disabled:opacity-40 disabled:pointer-events-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ToolButtonProps {
  label: string;
  hint: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolButton({ label, hint, active, disabled, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={hint}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(buttonClass, active && "bg-primary-weak text-primary hover:bg-primary-weak")}
    >
      {children}
    </button>
  );
}

/**
 * 최소 툴바 — 웹소설 본문에 실제로 쓰는 것만 둔다.
 * 폰트·색·정렬 같은 서식은 일부러 뺐다: 선택지가 늘수록 글쓰기 대신 꾸미기를 시작한다.
 */
export function EditorToolbar({
  editor,
  onOpenFind,
  onOpenHelp,
  findOpen,
  onToggleDisplay,
  displayOpen = false,
}: EditorToolbarProps) {
  const mod = useModLabel();

  return (
    <div
      role="toolbar"
      aria-label="글 서식"
      className="mb-12 flex flex-wrap items-center gap-2 border-b border-border pb-8"
    >
      <ToolButton
        label="굵게"
        hint={`굵게 (${mod}+B)`}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </ToolButton>
      <ToolButton
        label="기울임"
        hint={`기울임 (${mod}+I)`}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </ToolButton>
      <ToolButton
        label="취소선"
        hint={`취소선 (${mod}+Shift+S)`}
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </ToolButton>

      <span aria-hidden className="mx-4 h-16 w-1 bg-border" />

      <ToolButton
        label="인용"
        hint={`인용 (${mod}+Shift+B)`}
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </ToolButton>
      <ToolButton
        label="구분선"
        hint="구분선 넣기 — 장면 전환에 씁니다"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        —
      </ToolButton>

      <span aria-hidden className="mx-4 h-16 w-1 bg-border" />

      <ToolButton
        label="되돌리기"
        hint={`되돌리기 (${mod}+Z)`}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </ToolButton>
      <ToolButton
        label="다시하기"
        hint={`다시하기 (${mod}+Shift+Z)`}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </ToolButton>

      <span aria-hidden className="mx-4 h-16 w-1 bg-border" />

      <ToolButton
        label="찾기"
        hint={`찾기·바꾸기 (${mod}+F)`}
        active={findOpen}
        onClick={onOpenFind}
      >
        🔍
      </ToolButton>

      {onToggleDisplay && (
        <ToolButton
          label="본문 표시 설정"
          hint="본문 표시 설정 (글자 크기·줄 간격·폭)"
          active={displayOpen}
          onClick={onToggleDisplay}
        >
          Aa
        </ToolButton>
      )}

      <ToolButton
        label="단축키 안내"
        hint="단축키 안내"
        onClick={onOpenHelp}
      >
        ?
      </ToolButton>
    </div>
  );
}
