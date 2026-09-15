"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { rankDocuments } from "../lib/rankDocuments";

interface QuickOpenProps {
  open: boolean;
  documents: readonly DocumentNode[];
  onClose: () => void;
  onPick: (doc: DocumentNode) => void;
}

/**
 * 빠른 열기 — 제목 몇 글자로 문서를 찾아 Enter로 연다(스크리브너 Quick Search, 옵시디언 Quick Switcher).
 * 마우스 없이 회차 사이를 오가는 가장 짧은 길. 모달이지만 가볍게: 배경 클릭·Esc로 닫힌다.
 */
export function QuickOpen({ open, documents, onClose, onPick }: QuickOpenProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => rankDocuments(documents, query), [documents, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      // 마운트 직후 포커스 — autoFocus는 재오픈 때 안 먹는다.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  // Esc는 어디에 포커스가 있든 닫는다(입력이 포커스를 받기 전 0ms 사이에 눌러도 놓치지 않게).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pick = (doc: DocumentNode | undefined) => {
    if (!doc) return;
    onPick(doc);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="빠른 열기"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-16 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-border bg-bg shadow-lg">
        <input
          ref={inputRef}
          aria-label="문서 이름 검색"
          placeholder="문서 이름을 입력하세요… (↑↓ 이동, Enter 열기, Esc 닫기)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter는 확정일 뿐
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(hits.length - 1, c + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(hits[cursor]?.doc);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          className="h-48 border-b border-border bg-transparent px-16 text-body text-fg outline-none placeholder:text-fg-muted"
        />
        <ul role="listbox" aria-label="검색 결과" className="max-h-[50vh] overflow-y-auto py-4">
          {hits.length === 0 && (
            <li className="px-16 py-12 text-body-sm text-fg-weak">맞는 문서가 없어요.</li>
          )}
          {hits.map((h, i) => (
            <li
              key={h.doc.id}
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // 입력 포커스 유지
                pick(h.doc);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-8 px-16 py-8 text-body-sm",
                i === cursor ? "bg-primary-weak text-fg" : "text-fg hover:bg-surface",
              )}
            >
              <span className="w-32 shrink-0 text-caption text-fg-muted">
                {h.doc.type === "FOLDER" ? "폴더" : "문서"}
              </span>
              <span className="truncate">{h.doc.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
