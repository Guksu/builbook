"use client";

import { Button, cn } from "@shared/ui";
import { backupStatus } from "../lib/backup";
import { useBackup } from "../model/useBackup";

export interface BackupReminderProps {
  projectCount: number;
  onOpenBackup: () => void;
}

/**
 * 대시보드 상단 배너. "한 번도 백업 안 함" 또는 "7일 이상 지남"일 때만 나타난다.
 * 판정은 순수 함수 backupStatus 단일 출처 — 배너와 모달 문구가 어긋나지 않는다.
 */
export function BackupReminder({ projectCount, onOpenBackup }: BackupReminderProps) {
  const { status } = useBackup(projectCount);
  // 마운트 전(SSR)에는 status가 null — 배너를 그리지 않아 깜빡임이 없다.
  if (!status || status.level === "empty" || status.level === "ok") return null;

  return (
    <div
      role="status"
      aria-label="백업 안내"
      className={cn(
        "mb-16 flex flex-wrap items-center justify-between gap-12 rounded-lg border px-16 py-12",
        "border-border bg-surface",
      )}
    >
      <p className="text-body-sm text-fg">
        {status.message}
        <span className="ml-6 text-caption text-fg-weak">
          브라우저 데이터를 지우면 원고도 함께 사라져요.
        </span>
      </p>
      <Button size="sm" onClick={onOpenBackup}>
        백업하기
      </Button>
    </div>
  );
}

// 배너 노출 여부만 알고 싶은 소비처를 위한 재수출(판정 로직 단일 출처 유지).
export { backupStatus };
