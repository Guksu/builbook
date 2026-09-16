"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import { saveDocumentContent, documentsKey } from "@entities/document";
import { writingLogsKey } from "@entities/writing-log";
import type { TextMeasure } from "@shared/lib";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 800;
const backupKey = (id: string) => `builbook:doc-backup:${id}`;

export interface DocBackup {
  content: unknown;
  measure: TextMeasure;
}

/** 탭이 닫히거나 저장이 실패해 localStorage에 남긴 미저장 본문. 없으면 null. */
export function readBackup(documentId: string): DocBackup | null {
  try {
    const raw = localStorage.getItem(backupKey(documentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DocBackup>;
    return parsed && typeof parsed === "object" && "content" in parsed && parsed.measure
      ? (parsed as DocBackup)
      : null;
  } catch {
    return null;
  }
}

export function clearBackup(documentId: string): void {
  try {
    localStorage.removeItem(backupKey(documentId));
  } catch {
    /* 무시 */
  }
}

// 자동저장 훅(로컬 우선 · IndexedDB). 저장 상태표(idle/saving/saved/error)를 관리하고,
// 실패 시 localStorage에 백업하여 데이터 손실을 막는다.
export function useAutosave(documentId: string, projectId: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const statusRef = useRef<SaveStatus>("idle");
  statusRef.current = status;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ content: unknown; measure: TextMeasure } | null>(null);

  const flush = useCallback(async () => {
    if (!pending.current) return;
    const payload = pending.current;
    pending.current = null;
    setStatus("saving");
    try {
      await saveDocumentContent(documentId, payload.content, payload.measure);
      setStatus("saved");
      localStorage.removeItem(backupKey(documentId));
      // 문서 목록 캐시 무효화 → 다른 문서로 전환해도 최신 content 반영.
      void mutate(documentsKey(projectId));
      // 저장이 곧 집필 기록 갱신 — 열려 있는 집필 현황 패널이 바로 따라온다.
      void mutate(writingLogsKey(projectId));
    } catch {
      // 실패 → 로컬 백업 + error 상태. 다음 입력/언마운트 시 재시도.
      try {
        localStorage.setItem(backupKey(documentId), JSON.stringify(payload));
      } catch {
        /* storage full 등 무시 */
      }
      setStatus("error");
    }
  }, [documentId, projectId]);

  // 입력마다 호출: 예약된 저장을 debounce.
  const schedule = useCallback(
    (content: unknown, measure: TextMeasure) => {
      pending.current = { content, measure };
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

  // 탭을 닫거나 다른 곳으로 갈 때: debounce 대기 중인 본문을 localStorage에 즉시(동기) 남기고
  // IndexedDB 저장도 시도한다. IndexedDB 쓰기는 탭이 먼저 죽으면 끝나지 않을 수 있어,
  // 다음에 문서를 열 때 readBackup으로 되살린다(에디터가 처리).
  useEffect(() => {
    const onPageHide = () => {
      if (!pending.current) return;
      try {
        localStorage.setItem(backupKey(documentId), JSON.stringify(pending.current));
      } catch {
        /* 저장 불가 — 아래 flush에 맡긴다 */
      }
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
    // IndexedDB 쓰기가 진행 중인 짧은 순간에만 브라우저의 "나가시겠어요?" 확인을 띄운다.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (statusRef.current !== "saving" && !pending.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [documentId, flush]);

  return { status, schedule };
}
