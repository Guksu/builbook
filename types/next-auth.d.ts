import type { DefaultSession } from "next-auth";

// 세션 user에 id 노출 (소유권 검사에 사용). auth.config.ts의 session 콜백이 채운다.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// JWT 토큰에 id 보관 (jwt 콜백 → session 콜백 전달).
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
