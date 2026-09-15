"use client";

import { useEffect } from "react";

// Ctrl/⌘+P → 빠른 열기. 브라우저 인쇄 대화상자를 가로챈다(집필 화면에서 인쇄는 쓸 일이 없다).
// 입력 중(IME 조합)에도 열리게 두되, 이미 열려 있으면 다시 열지 않는다.
export function useQuickOpenShortcut(onOpen: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen, enabled]);
}
