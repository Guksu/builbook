"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@shared/ui";

// 클라이언트 전역 프로바이더: 인증 세션 + 토스트.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
