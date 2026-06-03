import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

// Edge-safe 설정 (Prisma·Node 전용 코드 없음). 미들웨어와 lib/auth가 공유.
export default {
  providers: [GitHub],
  pages: { signIn: "/login" },
  callbacks: {
    // 미들웨어 보호: /dashboard·/projects 는 인증 필요.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/dashboard") || pathname.startsWith("/projects");
      if (isProtected) return !!auth?.user;
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
