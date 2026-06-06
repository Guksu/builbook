# builbook

웹소설 집필 에디터. 레퍼런스는 **스크리브너**이되, 입문 작가도 5분 안에 쓸 수 있게 **진입장벽을 낮춘** 도구입니다.

문서 트리(바인더) · 집중 글쓰기 에디터 · 자동저장을 갖춘 **로컬 우선(local-first)** 앱으로, 로그인이나 서버 없이 모든 데이터를 브라우저 **IndexedDB**에 보관합니다.

## 핵심 기능

- **작품(Project) 관리** — 대시보드에서 작품을 만들고 열고 삭제. 수정 시각 표시.
- **바인더(문서 트리)** — 폴더/문서를 자유롭게 만들고, 이름 변경·삭제·**드래그 재정렬**. 폴더 삭제 시 하위 문서까지 cascade 삭제.
- **집중 글쓰기 에디터** — Tiptap(ProseMirror) 기반 단일 컬럼. 실시간 **단어 수** 표시.
- **자동저장** — 입력이 멎으면 800ms 뒤 저장(debounce). 저장 상태(저장 중/저장됨/오류)를 배지로 표시하고, 저장 실패 시 localStorage에 백업.
- **다크/라이트 테마** 토글.

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) · React 19 |
| 저장소 | 브라우저 IndexedDB (`idb`) — 백엔드·DB·로그인 없음 |
| 데이터 페칭 | SWR (IndexedDB를 fetcher로) |
| 에디터 | Tiptap (ProseMirror) + StarterKit |
| 스타일 | Tailwind CSS + 원티드 디자인 토큰(CSS 변수 SSOT) · Pretendard |
| 테스트 | Playwright (E2E) |

## 시작하기

```bash
npm install
npm run dev        # 개발 서버 → http://localhost:3000
```

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 빌드 결과 실행 |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright E2E 테스트 |

> 데이터는 브라우저 IndexedDB에만 저장됩니다. 다른 브라우저·기기·시크릿 창에서는 데이터가 공유되지 않습니다.

## 아키텍처 (Feature-Sliced Design)

Next `app/`은 라우팅 전용 얇은 래퍼이고, 화면 로직은 모두 `src/`의 FSD 레이어에 있습니다.

```
app/                  라우팅 (page.tsx) — src/views로 위임
  dashboard/          /dashboard      → 작품 목록
  projects/[id]/      /projects/:id   → 집필 워크스페이스
src/
  views/              화면 조립 (landing · dashboard · workspace)
  widgets/            복합 UI (binder · editor · inspector)
  features/           단위 기능 (autosave-document · reorder-document · toggle-theme)
  entities/           도메인 모델 + 데이터 훅 (project · document)
  shared/             공용 (db/IndexedDB 래퍼 · ui 컴포넌트)
```

별칭: `@views @widgets @features @entities @shared @app`

### 데이터 흐름

```
IndexedDB (shared/db)  ←→  entities 훅 (SWR)  ←→  views/widgets
```

- 컬렉션은 SWR 키로 캐시하고, 변경 후 `mutate()`로 재검증.
- 필드명은 저장소→훅→UI 전 구간 camelCase 통일.

## 라우트

| 경로 | 화면 |
|------|------|
| `/` | 랜딩 (시작하기 → 대시보드) |
| `/dashboard` | 작품 목록 |
| `/projects/[id]` | 바인더 + 에디터 + 인스펙터 |

## 범위 (MVP-1)

문서 트리 · 에디터 · 자동저장에 집중합니다. 캐릭터/스냅샷(버전), 서버 동기화는 백로그입니다.
