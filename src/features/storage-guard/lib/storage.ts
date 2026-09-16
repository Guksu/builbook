// 저장 공간 상태 판정 — 순수 함수(브라우저 API 비종속). 표시 문구는 여기 한 곳에서만 만든다.

export type PersistState = "persisted" | "not-persisted" | "unsupported";

export interface StorageEstimate {
  usage: number; // bytes
  quota: number; // bytes
}

export interface StorageSummary {
  persist: PersistState;
  /** 사용량 표시 문구. 추정이 불가능하면 null. */
  usageText: string | null;
  /** 남은 공간이 10% 미만이면 true. */
  nearlyFull: boolean;
  /** 사용자에게 보여줄 한 줄 안내. */
  message: string;
  /** 경고로 강조할지. */
  warn: boolean;
}

const UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < UNITS.length - 1) {
    value /= 1024;
    i += 1;
  }
  const digits = i === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(digits)} ${UNITS[i]}`;
}

export function summarizeStorage(
  persist: PersistState,
  estimate: StorageEstimate | null,
): StorageSummary {
  const usageText =
    estimate && estimate.quota > 0
      ? `${formatBytes(estimate.usage)} 사용 / ${formatBytes(estimate.quota)} 가능`
      : null;
  const nearlyFull =
    !!estimate && estimate.quota > 0 && estimate.quota - estimate.usage < estimate.quota * 0.1;

  if (nearlyFull) {
    return {
      persist,
      usageText,
      nearlyFull,
      warn: true,
      message: "저장 공간이 거의 찼어요. 백업 파일을 내려받고 브라우저 저장소를 정리하세요.",
    };
  }
  if (persist === "persisted") {
    return {
      persist,
      usageText,
      nearlyFull,
      warn: false,
      message: "브라우저가 이 사이트의 데이터를 자동으로 지우지 않도록 보호되고 있어요.",
    };
  }
  if (persist === "not-persisted") {
    // 크롬은 사이트를 자주 쓰기 전엔 보호를 승인하지 않는다 — 첫 방문자 대부분이 이 상태라
    // 빨간 경고로 겁주지 않고 차분히 알린다(공간이 정말 찼을 때만 경고).
    return {
      persist,
      usageText,
      nearlyFull,
      warn: false,
      message: "원고는 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 사라지니 백업을 자주 해 두세요.",
    };
  }
  return {
    persist,
    usageText,
    nearlyFull,
    warn: false,
    message: "이 브라우저는 저장 공간 보호를 지원하지 않아요. 백업을 자주 해 두세요.",
  };
}
