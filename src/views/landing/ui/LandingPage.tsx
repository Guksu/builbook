import Link from "next/link";
import { Button } from "@shared/ui";

// 랜딩 — 진입장벽 낮춤 메시지 + 단일 행동 유도.
export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center gap-24 px-24 text-center">
      <div className="flex flex-col gap-12">
        <h1 className="text-display text-fg">
          쓰기 시작하는 데
          <br />
          <span className="text-primary">5분이면</span> 충분해요
        </h1>
        <p className="text-body-lg text-fg-weak">
          스크리브너의 강력함은 그대로, 복잡함은 덜어낸 웹소설 집필 도구.
          <br />
          문서 트리로 구조를 잡고, 쓰는 즉시 자동 저장됩니다.
        </p>
      </div>
      <Link href="/dashboard">
        <Button size="lg">시작하기</Button>
      </Link>
    </main>
  );
}
