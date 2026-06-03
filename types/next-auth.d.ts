import type { DefaultSession } from "next-auth";

// 세션 user에 id를 노출 (소유권 검사에 사용). lib/auth.ts의 session 콜백이 채운다.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
