---
name: nextjs-api
description: "Next.js App Router 백엔드 API를 구현하는 스킬. Route Handler(route.ts), Auth.js(NextAuth) 인증, Prisma CRUD, 권한 검사, 응답 shape 규약, 입력 검증(zod), 일관된 에러 응답을 다룬다. API·엔드포인트·route handler·인증·로그인·서버 로직 구현 작업 시 반드시 사용."
---

# Next.js API 구현

Next.js App Router의 Route Handler로 백엔드 API를 구현한다. 가장 중요한 것은 **응답 shape 규약**을 엄격히 지키는 것이다 — 경계면 불일치가 런타임 크래시의 1순위 원인이다.

## 응답 shape 규약 (절대 준수)
- **단일 리소스**: 객체 그대로 — `NextResponse.json(project)`.
- **컬렉션**: 항상 `{ items: T[] }`로 감싼다 — `NextResponse.json({ items })`. 프론트는 `.items`로 unwrap.
- **필드명**: Prisma 모델 그대로 **camelCase**. snake_case 변환 금지.
- **에러**: `{ error: { code, message } }` + HTTP status(400/401/403/404/409/500).
- **생성**: 생성된 객체를 201로 반환.

이 규약을 `_workspace/03_api_contract.md`에 엔드포인트별로 명세하고 frontend-engineer에 전달한다. 이 문서가 프론트 훅 타입의 기준이다.

## 인증 & 권한
- Auth.js(NextAuth)로 세션을 구성. `app/api/auth/[...nextauth]/route.ts`.
- 모든 보호 엔드포인트: **세션 확인 → 리소스 소유권 확인**(`resource.ownerId === session.user.id`) 순서. 소유권 검사 누락은 보안 결함이다(다른 작가의 작품을 읽/쓰게 됨).
- 미인증은 401, 권한 없음은 403, 없는 리소스는 404.

## 표준 엔드포인트
```
GET/POST   /api/projects
GET/PATCH/DELETE /api/projects/[id]
GET/POST   /api/projects/[id]/documents      # 트리 조회 / 노드 생성
PATCH/DELETE /api/documents/[id]
PATCH      /api/documents/[id]/move           # 트리 이동·재정렬 (순환 참조 차단)
PUT        /api/documents/[id]/content        # 에디터 자동저장 (가볍게)
# ── 아래는 백로그 (MVP-1 제외) ──
POST       /api/documents/[id]/snapshots      # 버전 저장 [백로그]
GET/POST   /api/projects/[id]/characters       # [백로그]
PATCH/DELETE /api/characters/[id]              # [백로그]
```

## 구현 패턴 (예시)
```ts
// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "로그인 필요" } }, { status: 401 });
  const items = await prisma.project.findMany({ where: { ownerId: session.user.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ items }); // 컬렉션은 항상 래핑
}

const CreateProject = z.object({ title: z.string().min(1), description: z.string().optional() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "로그인 필요" } }, { status: 401 });
  const parsed = CreateProject.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID", message: "입력 오류" } }, { status: 400 });
  const project = await prisma.project.create({ data: { ...parsed.data, ownerId: session.user.id } });
  return NextResponse.json(project, { status: 201 }); // 단일 리소스는 그대로
}
```

## 특수 주의
- **자동저장(`PUT content`)**: 빈번하므로 가볍게. content와 wordCount만 업데이트. Snapshot은 별도/주기적으로만.
- **트리 이동(`move`)**: 자기 자손을 부모로 지정하는 순환 참조를 서버에서 차단.
- Prisma Client는 `lib/prisma.ts`에서 싱글톤으로(dev 핫리로드 시 연결 누수 방지).

## 핵심 원칙
- 응답 shape을 바꾸면 frontend-engineer에 반드시 통지(훅 타입 동기화 필요).
- "타입만 맞으면 통과"가 아니라 "런타임 응답이 실제로 그 shape인가"를 기준으로 생각한다.
