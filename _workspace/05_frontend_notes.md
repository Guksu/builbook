# 05 · 프론트엔드 노트 (FSD 구조 + 라우트/훅 매핑)

> 프론트는 Feature-Sliced Design. Next `app/`은 라우팅 전용 얇은 래퍼.

## 레이어 구조
```
src/
  app/        providers.tsx (SessionProvider + ToastProvider)
  views/      landing · login · dashboard · workspace   (페이지 조합, index.ts로 공개)
  widgets/    binder · editor                            (조합 UI 블록)
  features/   autosave-document (model:useAutosave, ui:SaveStatus) · reorder-document
  entities/   project(model:Project, api:useProjects) · document(model:DocumentNode, api:useDocuments)
  shared/     ui(디자인시스템 컴포넌트) · api(fetcher/apiSend/ApiError)
```
import 규칙: views→widgets→features→entities→shared (하위만). 별칭: `@views @widgets @features @entities @shared @app`.

## 라우트 ↔ view 매핑
| URL | Next 파일(얇음) | view |
|-----|----------------|------|
| `/` | `app/page.tsx` | `@views/landing` |
| `/login` | `app/login/page.tsx` | `@views/login` |
| `/dashboard` | `app/dashboard/page.tsx` | `@views/dashboard` |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | `@views/workspace` |

미인증 시 `/dashboard`·`/projects/*`는 `middleware.ts`(authConfig)가 `/login`으로 redirect.

## 훅 ↔ API 매핑 (경계면)
| 훅 | 엔드포인트 | unwrap |
|----|-----------|--------|
| `useProjects().projects` | GET `/api/projects` → `{items}` | `data.items` ✓ |
| `useProjects().createProject` | POST `/api/projects` | 객체 |
| `useDocuments().documents` | GET `/api/projects/[id]/documents` → `{items}` | `data.items` ✓ |
| create/rename/delete/move/reorderSiblings | 각 documents 엔드포인트 | — |
| `useAutosave` | PUT `/api/documents/[id]/content` `{content,wordCount}` | `{ok,updatedAt}` |

## 서버 인프라 (FSD 밖, 루트 유지)
`lib/`(prisma·auth·api·documents), `app/api/**`, `middleware.ts`, `auth.config.ts`, `types/`.
