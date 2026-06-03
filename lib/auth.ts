import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

// 서버 전용 인증 인스턴스: edge-safe authConfig + Prisma Adapter + JWT 세션.
// JWT 전략을 쓰는 이유: 미들웨어(Edge)에서 DB 조회 없이 세션을 검증하기 위함.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
});
