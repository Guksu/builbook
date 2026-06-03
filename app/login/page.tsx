"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-24">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-16 text-body-sm text-fg-weak">
            계정으로 로그인하면 작품이 안전하게 보관됩니다.
          </p>
          <Button block onClick={() => signIn("github", { callbackUrl })}>
            GitHub로 계속하기
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams는 Suspense 경계가 필요.
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
