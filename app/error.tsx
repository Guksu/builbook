"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@shared/ui";

// 라우트 세그먼트 에러 경계 — 화면이 하얗게 죽는 대신 복구 동작을 준다.
// 원고는 IndexedDB에 이미 저장돼 있으므로 "다시 시도"가 안전하다.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버가 없어 수집처는 없다. 개발자 도구에서 원인을 볼 수 있게만 남긴다.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center gap-16 px-24 text-center">
      <h1 className="text-h2 text-fg">문제가 생겼어요</h1>
      <p className="text-body text-fg-weak">
        화면을 그리다 오류가 났어요. 지금까지 쓴 글은 브라우저에 저장되어 있어요.
      </p>
      {error.digest && (
        <p className="text-caption text-fg-muted">오류 코드: {error.digest}</p>
      )}
      <div className="flex gap-8">
        <Button onClick={reset}>다시 시도</Button>
        <Link href="/dashboard">
          <Button variant="secondary">작품 목록으로</Button>
        </Link>
      </div>
    </main>
  );
}
