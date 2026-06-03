"use client";

import type { SaveStatus as Status } from "@/hooks/useAutosave";

const LABEL: Record<Status, string> = {
  idle: "저장됨",
  saving: "저장 중…",
  saved: "저장됨",
  error: "저장 실패 — 로컬 백업됨, 재시도 중",
};

// 은은한 저장 상태 표시. 타이핑을 방해하지 않도록 작고 조용하게.
export function SaveStatus({ status }: { status: Status }) {
  const color = status === "error" ? "text-error" : "text-fg-muted";
  return (
    <span className={`text-caption ${color}`} aria-live="polite">
      {LABEL[status]}
    </span>
  );
}
