# 05 · 프론트엔드 노트 (FSD + 로컬 우선/IndexedDB)

> 프론트는 Feature-Sliced Design. Next `app/`은 라우팅 전용 얇은 래퍼.
> **로컬 우선:** 백엔드·DB·로그인 없음. 모든 데이터는 브라우저 IndexedDB(`idb`)에.

## 레이어 구조
```
src/
  app/        providers.tsx (ThemeProvider + ToastProvider)  ← 세션 프로바이더 없음
  views/      landing · dashboard · workspace
  widgets/    binder · editor · inspector
  features/   autosave-document · reorder-document · toggle-theme
  entities/   project(model+api:useProjects) ·
              document(model+api:useDocuments, saveDocumentContent, documentsKey)
  shared/     ui(디자인시스템 컴포넌트) · db(IndexedDB 래퍼: idb)
```
import 규칙: views→widgets→features→entities→shared. 별칭: `@views @widgets @features @entities @shared @app`.

## 라우트 ↔ view
| URL | Next 파일 | view | 비고 |
|-----|----------|------|------|
| `/` | `app/page.tsx` | `@views/landing` | "시작하기"→/dashboard |
| `/dashboard` | `app/dashboard/page.tsx` | `@views/dashboard` | 정적, 보호 없음 |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | `@views/workspace` | 3단 패널 |

(로그인·미들웨어 없음)

## 데이터 계층 (IndexedDB)
- `shared/db` — `idb`로 DB "builbook" 오픈. object store: `projects`, `documents`(index `by-project`). 도메인 비종속 헬퍼(dbGetAll/ByProject/Get/Put/Delete/BulkPut/BulkDelete).
- `entities/project/api/useProjects` — SWR key `"projects"`, 목록/생성/삭제. id=`crypto.randomUUID()`, 타임스탬프 ISO.
- `entities/document/api/useDocuments(projectId)` — SWR key `documents:${projectId}`. create/rename/updateSynopsis/delete(하위 cascade 수동)/move/reorderSiblings.
- `saveDocumentContent(id, content, wordCount)` — 자동저장 전용 독립 함수.
- `useAutosave(documentId, projectId)` — debounce 저장 → `saveDocumentContent` → `mutate(documentsKey)`로 목록 캐시 갱신. 실패 시 localStorage 백업.

## 빌드/실행
- `npm run build` 성공(4 라우트: /, /dashboard, /projects/[id], _not-found). API·middleware 없음.
- `npm run dev` → localhost:3000. **로그인 없이 바로 작품 생성·집필 가능**. 데이터는 그 브라우저의 IndexedDB에만 저장(기기 간 동기화 없음).
