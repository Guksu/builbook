"use client";

// 같은 문서를 다른 탭에서도 열었을 때 에디터 위에 띄우는 경고.
export function TabConflictBanner() {
  return (
    <div
      role="alert"
      className="border-b border-warning bg-warning-weak px-16 py-8 text-body-sm text-warning-strong"
    >
      이 문서가 다른 탭에서도 열려 있어요. 두 곳에서 같이 쓰면 나중에 저장한 쪽만 남아요. 한 곳에서만
      써 주세요.
    </div>
  );
}
