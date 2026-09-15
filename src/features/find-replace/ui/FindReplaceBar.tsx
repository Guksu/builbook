"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button, Input, cn } from "@shared/ui";
import { stepMatchIndex, type DocMatch } from "../lib/findMatches";
import {
  clearFindHighlight,
  findMatchesInDoc,
  setFindHighlight,
} from "../model/findHighlight";
import { replaceAllMatches, replaceMatch } from "../model/applyReplace";

export interface FindReplaceBarProps {
  editor: Editor;
  /** 닫기 — 닫히면 하이라이트도 사라진다 */
  onClose: () => void;
}

/**
 * 본문 위에 접혔다 펴지는 찾기·바꾸기 바.
 * 입문 작가가 멈칫하지 않도록 기본은 '찾기' 한 줄이고, 바꾸기 칸은 늘 같은 자리에 함께 둔다.
 */
export function FindReplaceBar({ editor, onClose }: FindReplaceBarProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState<DocMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const queryRef = useRef<HTMLInputElement>(null);

  // 열리면 바로 검색어를 칠 수 있게.
  useEffect(() => {
    queryRef.current?.focus();
  }, []);

  // 검색어·옵션·본문이 바뀔 때마다 다시 찾는다(본문은 editor의 update 이벤트로 통지받는다).
  const recompute = useCallback(() => {
    if (editor.isDestroyed) return;
    const found = findMatchesInDoc(editor.state.doc, query, { caseSensitive });
    setMatches(found);
    setActiveIndex((prev) => {
      if (found.length === 0) return -1;
      return prev < 0 ? 0 : Math.min(prev, found.length - 1);
    });
  }, [editor, query, caseSensitive]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    editor.on("update", recompute);
    return () => {
      editor.off("update", recompute);
    };
  }, [editor, recompute]);

  // 계산 결과를 본문 하이라이트로 반영.
  useEffect(() => {
    setFindHighlight(editor, matches, activeIndex);
  }, [editor, matches, activeIndex]);

  // 현재 일치가 화면 밖이면 끌어온다(포커스는 검색어 칸에 그대로 둔다).
  useEffect(() => {
    if (activeIndex < 0 || editor.isDestroyed) return;
    const raf = requestAnimationFrame(() => {
      editor.view.dom
        .querySelector(".find-match--active")
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, [editor, activeIndex, matches]);

  // 바가 사라지면 하이라이트도 같이 걷는다.
  useEffect(() => {
    return () => clearFindHighlight(editor);
  }, [editor]);

  const step = (direction: 1 | -1) =>
    setActiveIndex((prev) => stepMatchIndex(matches.length, prev, direction));

  const current = activeIndex >= 0 ? matches[activeIndex] : null;

  const handleReplace = () => {
    if (!current) return;
    replaceMatch(editor, current, replacement);
    // 바꾼 뒤에는 같은 자리에 온 다음 일치를 보게 된다(update → recompute가 목록을 새로 만든다).
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;
    replaceAllMatches(editor, matches, replacement);
  };

  const counter =
    matches.length > 0 ? `${activeIndex + 1}/${matches.length}` : query ? "0/0" : "";

  return (
    <div
      role="search"
      aria-label="찾기 및 바꾸기"
      className="mb-12 flex flex-wrap items-center gap-8 rounded-md border border-border bg-surface px-12 py-8"
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // 집중 모드 ESC(window 리스너)까지 번지지 않게 여기서 끊는다.
        e.stopPropagation();
        onClose();
      }}
    >
      <Input
        ref={queryRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            step(e.shiftKey ? -1 : 1);
          }
        }}
        placeholder="찾을 말"
        aria-label="찾을 말"
        className="h-32 w-[160px] text-body-sm"
      />
      <span
        aria-live="polite"
        className="min-w-[44px] text-caption tabular-nums text-fg-weak"
      >
        {counter}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="px-8"
        onClick={() => step(-1)}
        disabled={matches.length === 0}
        aria-label="이전 일치"
        title="이전 일치 (Shift+Enter)"
      >
        ↑
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="px-8"
        onClick={() => step(1)}
        disabled={matches.length === 0}
        aria-label="다음 일치"
        title="다음 일치 (Enter)"
      >
        ↓
      </Button>
      <button
        type="button"
        aria-pressed={caseSensitive}
        aria-label="대소문자 구분"
        title="대소문자 구분"
        onClick={() => setCaseSensitive((v) => !v)}
        className={cn(
          "h-32 rounded-md px-8 text-body-sm transition-colors",
          caseSensitive
            ? "bg-primary-weak text-primary"
            : "text-fg-weak hover:bg-bg hover:text-fg",
        )}
      >
        Aa
      </button>

      <span aria-hidden className="mx-4 h-16 w-1 bg-border" />

      <Input
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        placeholder="바꿀 말"
        aria-label="바꿀 말"
        className="h-32 w-[160px] text-body-sm"
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={handleReplace}
        disabled={!current}
      >
        바꾸기
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleReplaceAll}
        disabled={matches.length === 0}
      >
        모두 바꾸기
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto px-8"
        onClick={onClose}
        aria-label="찾기 닫기"
        title="찾기 닫기 (Esc)"
      >
        ✕
      </Button>
    </div>
  );
}
