"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiSend } from "@shared/api";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 800;
const backupKey = (id: string) => `builbook:doc-backup:${id}`;

// 자동저장 훅. 저장 상태표(idle/saving/saved/error)를 관리하고,
// 실패 시 로컬(localStorage)에 백업하여 데이터 손실을 막는다.
export function useAutosave(documentId: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ content: unknown; wordCount: number } | null>(null);

  const flush = useCallback(async () => {
    if (!pending.current) return;
    const payload = pending.current;
    pending.current = null;
    setStatus("saving");
    try {
      await apiSend(`/api/documents/${documentId}/content`, "PUT", payload);
      setStatus("saved");
      localStorage.removeItem(backupKey(documentId));
    } catch {
      // 실패 → 로컬 백업 + error 상태. 다음 입력/언마운트 시 재시도.
      try {
        localStorage.setItem(backupKey(documentId), JSON.stringify(payload));
      } catch {
        /* storage full 등 무시 */
      }
      setStatus("error");
    }
  }, [documentId]);

  // 입력마다 호출: 예약된 저장을 debounce.
  const schedule = useCallback(
    (content: unknown, wordCount: number) => {
      pending.current = { content, wordCount };
      if (status !== "saving") setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush, status],
  );

  // 언마운트 시 마지막 저장 시도.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  return { status, schedule };
}
