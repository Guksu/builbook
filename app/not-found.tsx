import Link from "next/link";
import { Button } from "@shared/ui";

// 없는 주소 — 삭제한 작품 링크나 오타. 목록으로 돌려보낸다.
export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center gap-16 px-24 text-center">
      <h1 className="text-h2 text-fg">이 페이지는 없어요</h1>
      <p className="text-body text-fg-weak">
        주소가 틀렸거나, 작품이 삭제되었을 수 있어요.
      </p>
      <Link href="/dashboard">
        <Button>작품 목록으로</Button>
      </Link>
    </main>
  );
}
