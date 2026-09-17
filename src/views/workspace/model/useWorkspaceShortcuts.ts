"use client";

// 작업실 키보드 단축키.
// Ctrl/⌘+P 빠른 열기(열림 상태까지 여기서 보관)와 Alt+S 진행 상태 순환을 담당한다.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useQuickOpenShortcut } from "@features/quick-open";
import { nextStatus, docStatusLabel } from "@features/corkboard";
import type { DocumentNode } from "@entities/document";
import { useToast } from "@shared/ui";
import type { DocumentsApi } from "./types";
import type { WorkspacePanelKey } from "@widgets/workspace-header";
import { PANEL_KEYS } from "./useWorkspacePanels";

interface UseWorkspaceShortcutsParams {
  documents: DocumentNode[];
  selectedId: string | null;
  updateStatus: DocumentsApi["updateStatus"];
  /** Ctrl/⌘+Shift+1~8 → 패널 토글(순서는 PANEL_KEYS). */
  onTogglePanel: (key: WorkspacePanelKey) => void;
}

export function useWorkspaceShortcuts({
  documents,
  selectedId,
  updateStatus,
  onTogglePanel,
}: UseWorkspaceShortcutsParams): {
  quickOpen: boolean;
  setQuickOpen: Dispatch<SetStateAction<boolean>>;
} {
  const { toast } = useToast();
  // 빠른 열기(Ctrl/⌘+P) — 제목으로 문서를 찾아 바로 연다.
  const [quickOpen, setQuickOpen] = useState(false);
  const openQuick = useCallback(() => setQuickOpen(true), []);
  useQuickOpenShortcut(openQuick);

  // Alt+S — 현재 문서의 진행 상태를 초고→퇴고→완료 순으로 돌린다(인스펙터를 열지 않고도).
  // 최신 값은 ref로 읽는다 — useDocuments가 매 렌더 새 함수를 주므로 의존성에 넣으면
  // 타이핑할 때마다 리스너를 떼었다 붙인다.
  const latest = useRef({ documents, selectedId, updateStatus, toast, onTogglePanel });
  latest.current = { documents, selectedId, updateStatus, toast, onTogglePanel };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl/⌘+Shift+1~8 — 패널 토글. (Ctrl/⌘+숫자만 쓰면 브라우저 탭 전환에 먹힌다.)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && /^(Digit|Numpad)[1-8]$/.test(e.code)) {
        const idx = Number(e.code.slice(-1)) - 1;
        const key = PANEL_KEYS[idx];
        if (key) {
          e.preventDefault();
          latest.current.onTogglePanel(key);
        }
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey || e.key.toLowerCase() !== "s") return;
      const { documents: docsNow, selectedId: id, updateStatus: update, toast: notify } = latest.current;
      const doc = docsNow.find((d) => d.id === id);
      if (!doc || doc.type !== "DOC") return;
      e.preventDefault();
      const next = nextStatus(doc.status);
      void update(doc.id, next);
      notify(`상태: ${docStatusLabel(next)}`, "success");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { quickOpen, setQuickOpen };
}
