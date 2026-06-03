import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// 일관된 에러 응답: { error: { code, message } } + HTTP status
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// 세션 보장. 미인증이면 null 대신 401 응답을 던지도록 호출측에서 분기.
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as { id: string; email?: string | null; name?: string | null };
}

export const UNAUTHENTICATED = apiError("UNAUTHENTICATED", "로그인이 필요합니다.", 401);
