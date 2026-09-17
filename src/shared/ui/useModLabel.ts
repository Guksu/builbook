"use client";

// 단축키 안내 표기 — macOS는 ⌘, 그 외는 Ctrl.
// SSR에는 navigator가 없으므로 항상 "Ctrl"로 먼저 그리고, 마운트 후에 보정한다(하이드레이션 불일치 방지).

import { useEffect, useState } from "react";

export type ModLabel = "Ctrl" | "⌘";

export function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  // navigator.platform은 폐기 예정이라 userAgent를 함께 본다(아이패드 데스크톱 모드 포함).
  const source = `${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`;
  return /Mac|iPhone|iPad|iPod/i.test(source);
}

/** 단축키 문구에 끼워 넣을 수식 키 이름. */
export function useModLabel(): ModLabel {
  const [label, setLabel] = useState<ModLabel>("Ctrl");
  useEffect(() => {
    if (detectIsMac()) setLabel("⌘");
  }, []);
  return label;
}
