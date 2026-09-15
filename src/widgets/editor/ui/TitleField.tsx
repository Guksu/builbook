"use client";

import { useEffect, useRef, useState } from "react";

export interface TitleFieldProps {
  title: string;
  /** 없으면 편집 불가(읽기 전용 제목) */
  onRename?: (title: string) => void;
  /** 바깥(F2 등)에서 편집을 시작시키는 신호 — 값이 바뀌면 편집 모드로 들어간다 */
  editSignal?: number;
}

/**
 * 에디터 상단 제목 — 누르거나 F2로 바로 고친다.
 * 회차 제목은 쓰다가 자주 바뀌는데, 그때마다 바인더로 손이 가면 글의 흐름이 끊긴다.
 */
export function TitleField({ title, onRename, editSignal = 0 }: TitleFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  // 최초 마운트 때의 editSignal은 무시한다(열자마자 편집 모드가 되면 놀란다).
  const seenSignal = useRef(editSignal);

  useEffect(() => {
    if (!onRename) return;
    if (editSignal === seenSignal.current) return;
    seenSignal.current = editSignal;
    setDraft(title);
    setEditing(true);
  }, [editSignal, onRename, title]);

  // 다른 문서로 옮겨가면 편집 상태를 끌고 가지 않는다.
  useEffect(() => {
    setEditing(false);
    setDraft(title);
  }, [title]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    // 공백 제목은 무시 — 제목 없는 회차는 바인더에서 찾을 수 없다.
    if (!next || next === title) {
      setDraft(title);
      return;
    }
    onRename?.(next);
  };

  if (!onRename) {
    return <h1 className="text-h3 text-fg">{title}</h1>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        aria-label="문서 제목"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            // 집중 모드 ESC까지 번지지 않게 여기서 끊는다.
            e.stopPropagation();
            setDraft(title);
            setEditing(false);
          }
        }}
        className="-mx-6 w-full max-w-[420px] rounded-md border border-border bg-bg px-6 py-2 text-h3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }

  return (
    <h1 className="text-h3 text-fg">
      <button
        type="button"
        title="제목 편집 (F2)"
        onClick={() => {
          setDraft(title);
          setEditing(true);
        }}
        className="-mx-6 rounded-md px-6 py-2 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {title}
      </button>
    </h1>
  );
}
