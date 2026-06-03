import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

// Auth.js (NextAuth v5). Prisma Adapter + database 세션.
// 로그인 프로바이더: GitHub (AUTH_GITHUB_ID / AUTH_GITHUB_SECRET 환경변수 필요).
// 추가 프로바이더가 필요하면 providers 배열에 더한다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [GitHub],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 세션에 user.id 노출 (소유권 검사에 사용)
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
