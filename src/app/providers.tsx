"use client";

import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@shared/ui";

// 클라이언트 전역 프로바이더: 테마(라이트/다크/시스템) + 토스트.
// 로컬 우선 구조 — 인증/세션 프로바이더 없음.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
