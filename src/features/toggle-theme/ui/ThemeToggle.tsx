"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@shared/ui";

// 라이트/다크 토글. next-themes가 <html>의 .dark 클래스를 토글하면
// globals.css의 .dark 시맨틱 변수 오버라이드가 전체 UI에 자동 반영된다.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // SSR/CSR 불일치 방지: 마운트 전에는 테마 의존 아이콘을 확정하지 않는다.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (isDark ? "☀️" : "🌙") : "🌙"}
    </Button>
  );
}
