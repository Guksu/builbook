# 빌드 결정 사항 (MVP-1)

## 스택
- **프레임워크:** Next.js (App Router) 풀스택
- **DB/ORM:** Postgres + Prisma (직접)
- **인증:** Auth.js (NextAuth) + Prisma Adapter
- **에디터:** Tiptap (ProseMirror)
- **스타일:** Tailwind + 원티드 디자인 토큰(공개 소스 실값) + Pretendard 폰트
  - 원티드 컴포넌트 패키지(`@wanteddev/wds`) **미사용** — 토큰 값만 차용

## MVP-1 범위
**포함:** 문서 트리(바인더) + 에디터(Tiptap) + 자동저장. 엔티티 = User · Project · Document.
**백로그(제외):** Character(인물 카드), Snapshot(서버 버전 기록). 단 자동저장 실패 시 클라이언트 로컬 백업은 포함.

## 파일 소유권 (충돌 방지)
- 스캐폴드(오케스트레이터): `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `.gitignore`, `.env.example`, `lib/prisma.ts`
- design-system-specialist 소유: `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `app/fonts.ts`, `components/ui/**`
- data-modeler 소유: `prisma/schema.prisma`, `prisma/seed.ts`
- backend-engineer 소유: `app/api/**`, `lib/auth.ts`
- editor-engineer 소유: `components/editor/**`, `components/binder/**`, 자동저장 훅
- frontend-engineer 소유: `app/(...)/**/page.tsx`, `app/**/layout.tsx`(루트 제외), `hooks/**`

## 토큰 핵심값 (원티드 실값)
- primary = `#0066FF` (blue.50), hover `#005EEB`, active `#0054D1`
- fg `#171717`, fg-weak `#737373`, bg `#FFFFFF`, surface `#F7F7F7`, border `#DCDCDC`
- success `#00BF40`, warning `#FF9200`, error `#FF4242`
- font: Pretendard
