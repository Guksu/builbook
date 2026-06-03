import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Edge 런타임 미들웨어 — authConfig만 사용(Prisma 미포함).
// authorized 콜백이 /dashboard·/projects 보호 + 미인증 시 /login 리다이렉트 처리.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*"],
};
