"use client";

import { useEffect } from "react";

// 서비스 워커 등록 — 프로덕션에서만(개발 서버·e2e에서는 캐시가 디버깅을 헷갈리게 한다).
// 워커 자체는 public/sw.js. 로컬 우선 앱이라 오프라인에서도 열리는 게 자연스럽다.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* 등록 실패는 기능 저하일 뿐(온라인에서는 정상 동작) */
    });
  }, []);
  return null;
}
