---
name: prisma-data-model
description: "Postgres + Prisma 데이터 모델을 설계하는 스킬. schema.prisma 작성, 자기참조 트리(바인더) 모델링, 관계·인덱스·제약, Auth.js 테이블, 마이그레이션·시드를 다룬다. 데이터 모델·Prisma 스키마·DB 설계·마이그레이션·ERD 작업 시 반드시 사용."
---

# Prisma 데이터 모델 설계

웹소설 에디터의 데이터 모델을 Postgres + Prisma로 설계한다. 이 스키마는 백엔드 API와 에디터가 강하게 의존하는 단일 진실 공급원이다.

## 핵심 규칙
- **필드명은 camelCase로 통일한다.** Prisma 필드가 곧 API 응답 필드가 된다. snake_case를 쓰면 DB→API→프론트 경계에서 변환 누락 버그(`thumbnailUrl` vs `thumbnail_url`)가 생긴다. DB 컬럼 매핑은 `@map`으로 처리하되 Prisma 필드명은 camelCase 유지.
- **자기참조 트리(바인더)**: `Document.parentId`로 트리를 만들고 `onDelete: Cascade`로 부모 삭제 시 자식이 함께 삭제되게 한다(고아 노드 방지). 정렬은 형제 내 `order: Int`만 사용 — 전역 정렬은 재정렬 비용이 크다.
- **모든 조회 키에 인덱스**: projectId, parentId, documentId, ownerId에 `@@index`.
- **content는 Json 타입** — Tiptap ProseMirror 문서. editor-engineer가 기대하는 doc 구조와 합의 후 확정.

## MVP-1 범위
현재 빌드는 **User · Project · Document** 만 마이그레이션한다. 아래 골격의 **Character·Snapshot 모델과 그 관계(`Project.characters`, `Document.snapshots`)는 백로그**이므로 초기 `migrate`에서 제외한다(스키마는 미래 참고용으로 함께 기록).

## 표준 스키마 골격
```prisma
enum DocType { FOLDER DOC }

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  image     String?
  projects  Project[]
  createdAt DateTime  @default(now())
  // Auth.js 연동 시 Account/Session/VerificationToken 모델 추가
}

model Project {
  id          String     @id @default(cuid())
  title       String
  description String?
  owner       User       @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId     String
  documents   Document[]
  characters  Character[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  @@index([ownerId])
}

model Document {
  id        String     @id @default(cuid())
  project   Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId String
  parent    Document?  @relation("Tree", fields: [parentId], references: [id], onDelete: Cascade)
  parentId  String?
  children  Document[] @relation("Tree")
  type      DocType    @default(DOC)
  title     String
  order     Int        @default(0)
  content   Json?
  synopsis  String?
  wordCount Int        @default(0)
  snapshots Snapshot[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  @@index([projectId])
  @@index([parentId])
}

model Character {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId   String
  name        String
  description String?
  fields      Json?
  createdAt   DateTime @default(now())
  @@index([projectId])
}

model Snapshot {
  id         String   @id @default(cuid())
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  documentId String
  content    Json
  createdAt  DateTime @default(now())
  @@index([documentId])
}
```
> Auth.js(NextAuth) Prisma Adapter를 쓰면 공식 Account/Session/VerificationToken 모델을 추가한다.

## 마이그레이션
- 초기: `npx prisma migrate dev --name init`. 시드 데이터(`prisma/seed.ts`)로 데모 작품 1개를 넣어 빈 상태/채워진 상태 모두 테스트 가능하게 한다.
- 파괴적 변경(컬럼 삭제, 타입 변경)은 사용자에게 확인 후 진행.

## 출력: `prisma/schema.prisma` + `_workspace/02_data_model.md`(ERD 텍스트 + 필드 사전 + 마이그레이션 노트)

## 핵심 원칙
- 필드명 변경은 경계면 버그의 주원인 — 변경 시 backend-engineer·qa-inspector에 즉시 통지.
- 스키마는 product-spec의 도메인 모델과 1:1로 일치시킨다.
