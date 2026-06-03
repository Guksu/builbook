# API 계약 (MVP-1) — 프론트 훅 타입의 기준

> 작성: team-lead. nextjs-api 스킬 규약 적용. 모든 필드 camelCase. **컬렉션은 `{ items: T[] }`, 단일은 객체 그대로.** 프론트 훅은 컬렉션에서 반드시 `.items` unwrap.

## 공통
- 인증: 미인증 → `401 { error: { code:"UNAUTHENTICATED", message } }`. 타인 리소스 → `403 FORBIDDEN`. 없음 → `404 NOT_FOUND`. 입력 오류 → `400 INVALID`. 순환 이동 → `409 CONFLICT`.
- 세션 user.id로 소유권 검사.

## 타입
```ts
type DocType = "FOLDER" | "DOC";
interface Project { id:string; title:string; description:string|null; ownerId:string; createdAt:string; updatedAt:string; }
interface Document { id:string; projectId:string; parentId:string|null; type:DocType; title:string; order:number; content:unknown|null; synopsis:string|null; wordCount:number; createdAt:string; updatedAt:string; }
```

## 엔드포인트
| 메서드 | 경로 | 요청 body | 응답 |
|--------|------|-----------|------|
| GET | `/api/projects` | — | `{ items: Project[] }` |
| POST | `/api/projects` | `{ title, description? }` | `Project` (201) |
| GET | `/api/projects/[id]` | — | `Project` |
| PATCH | `/api/projects/[id]` | `{ title?, description? }` | `Project` |
| DELETE | `/api/projects/[id]` | — | `204` (no body) |
| GET | `/api/projects/[id]/documents` | — | `{ items: Document[] }` (평면, parentId로 트리 구성) |
| POST | `/api/projects/[id]/documents` | `{ title, type?, parentId?, order? }` | `Document` (201) |
| PATCH | `/api/documents/[id]` | `{ title?, synopsis? }` | `Document` |
| DELETE | `/api/documents/[id]` | — | `204` (하위 cascade) |
| PATCH | `/api/documents/[id]/move` | `{ parentId: string\|null, order: number }` | `Document` (순환 시 409) |
| PUT | `/api/documents/[id]/content` | `{ content: ProseMirrorJSON, wordCount? }` | `{ ok:true, updatedAt }` |
| GET/POST | `/api/auth/[...nextauth]` | Auth.js | 세션/콜백 |

## 프론트 인계 주의 (경계면)
1. `GET /api/projects`·`GET .../documents`는 **`{ items }` 래핑** → 훅에서 `const { items } = await res.json(); return items;`. 배열로 바로 캐스팅 금지(`.filter is not a function` 유발).
2. 자동저장 응답은 `{ ok, updatedAt }`이지 Document 전체가 아님 — 에디터는 updatedAt만 사용.
3. DELETE는 204(no body) — `res.json()` 호출 금지.
4. 트리는 평면 배열로 오므로 클라이언트가 `parentId`로 중첩 구성.

## 인증 설정 요건 (사용자 액션 필요)
- `.env`에 `AUTH_SECRET`, `DATABASE_URL` 필수. GitHub 로그인 쓰려면 `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` 추가.
- 로그인 프로바이더는 현재 GitHub. 다른 방식(이메일 매직링크 등)이 필요하면 `lib/auth.ts`에 추가.
