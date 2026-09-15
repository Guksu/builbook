"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_COUNT_UNIT, isCountUnit, type CountUnit } from "@shared/lib";

// 분량 단위 설정 — 브라우저 전체에 하나(작품별이 아니다). localStorage에 두고
// 같은 탭의 모든 구독자에게 커스텀 이벤트로, 다른 탭에는 storage 이벤트로 전파한다.
const KEY = "builbook:count-unit";
const EVENT = "builbook:count-unit-change";

function read(): CountUnit {
  try {
    const raw = localStorage.getItem(KEY);
    return isCountUnit(raw) ? raw : DEFAULT_COUNT_UNIT;
  } catch {
    return DEFAULT_COUNT_UNIT;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useCountUnit(): [CountUnit, (unit: CountUnit) => void] {
  // 서버 스냅샷은 기본값 — 하이드레이션 후 클라이언트 값으로 바뀐다.
  const unit = useSyncExternalStore(subscribe, read, () => DEFAULT_COUNT_UNIT);
  const setUnit = useCallback((next: CountUnit) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* 저장 불가 브라우저 — 이번 세션만 반영 */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [unit, setUnit];
}
