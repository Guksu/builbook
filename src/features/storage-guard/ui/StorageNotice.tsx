"use client";

import { cn } from "@shared/ui";
import { useStorageGuard } from "../model/useStorageGuard";

// 저장 공간 한 줄 안내. 대시보드 하단·백업 모달에서 같은 훅을 쓴다(문구 단일 출처).
export function StorageNotice({ className }: { className?: string }) {
  const summary = useStorageGuard();
  if (!summary) return null;
  return (
    <p
      role="status"
      aria-label="저장 공간 안내"
      className={cn(
        "text-caption",
        summary.warn ? "text-warning-strong" : "text-fg-weak",
        className,
      )}
    >
      {summary.message}
      {summary.usageText && (
        <span className="ml-6 tabular-nums text-fg-muted">({summary.usageText})</span>
      )}
    </p>
  );
}
