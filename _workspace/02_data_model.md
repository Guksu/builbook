# 데이터 모델 (MVP-1) — 필드 사전 & API shape 기준

> 작성: team-lead 대행(data-modeler 무응답으로 재할당). 이 문서가 backend의 **API 응답 shape 기준**이다. 필드명은 전 구간 camelCase.

## ERD (텍스트)
```
User 1───∞ Project 1───∞ Document
                              └──∞ Document (자기참조 트리: parentId)
User 1───∞ Account / Session   (Auth.js)
```

## 필드 사전

### User
| 필드 | 타입 | 비고 |
|------|------|------|
| id | String(cuid) | PK |
| name | String? | |
| email | String | unique |
| image | String? | |

### Project
| 필드 | 타입 | 비고 |
|------|------|------|
| id | String(cuid) | PK |
| title | String | 필수 |
| description | String? | |
| ownerId | String | →User, 소유권 검사 기준 |
| createdAt / updatedAt | DateTime | |

### Document (바인더 노드)
| 필드 | 타입 | 비고 |
|------|------|------|
| id | String(cuid) | PK |
| projectId | String | →Project |
| parentId | String? | →Document(자기참조). null=루트 |
| type | DocType | `FOLDER` \| `DOC` |
| title | String | |
| order | Int | 형제 내 정렬(@default 0) |
| content | Json? | Tiptap ProseMirror 문서. DOC만 사용 |
| synopsis | String? | 인스펙터 메모 |
| wordCount | Int | @default 0 |
| createdAt / updatedAt | DateTime | |

## API 응답 shape 규약 (backend·frontend 공통 기준)
- 단일 리소스: 객체 그대로 — `Project`, `Document`.
- 컬렉션: `{ items: T[] }` 래핑 → 프론트 훅은 `.items` unwrap.
- 트리 조회: `GET /api/projects/[id]/documents` → `{ items: Document[] }`(평면 배열, parentId로 클라이언트가 트리 구성) — 또는 중첩. backend가 contract에 명시.
- 자동저장: `PUT /api/documents/[id]/content` body = `{ content: <ProseMirror JSON>, wordCount: number }`.

## 마이그레이션 노트
- 초기: `npx prisma migrate dev --name init` → User/Project/Document + Auth.js(Account/Session/VerificationToken).
- 시드: `npm run db:seed` (데모 작품 + 문서 트리).
- 백로그(Character/Snapshot)는 schema.prisma 하단 주석 — 추후 별도 마이그레이션.

## 주의 (경계면)
- 필드명 변경 시 backend·frontend·qa에 즉시 통지.
- 트리 이동(`move`)은 순환 참조(자기 자손을 부모로)를 서버에서 차단해야 함.
