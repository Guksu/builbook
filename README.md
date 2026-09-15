# builbook

웹소설 집필 에디터. 레퍼런스는 **스크리브너**이되, 입문 작가도 5분 안에 쓸 수 있게 **진입장벽을 낮춘** 도구입니다.

문서 트리(바인더) · 집중 글쓰기 에디터 · 자동저장을 갖춘 **로컬 우선(local-first)** 앱으로, 로그인이나 서버 없이 모든 데이터를 브라우저 **IndexedDB**에 보관합니다.

## 핵심 기능

- **작품(Project) 관리** — 대시보드에서 작품을 만들고 열고 삭제. 새 작품에는 "1화" 문서가 준비된다.
- **바인더(문서 트리, 옵시디언 참고)** — 새 문서는 "N화"로 즉시 생성 후 그 자리에서 이름 편집. 더블클릭/F2 이름 변경, 우클릭 메뉴, 폴더 접기, 정렬, 키보드 이동, **드래그 재정렬**. 삭제는 휴지통으로.
- **집중 글쓰기 에디터** — Tiptap(ProseMirror) 단일 컬럼. 최소 툴바, 찾기·바꾸기(Ctrl/⌘+F), 제목 인라인 수정, 집중 모드.
- **자동저장** — 입력이 멎으면 800ms 뒤 저장(debounce). 저장 상태 배지, 실패 시 localStorage 백업, 같은 문서를 다른 탭에서 열면 경고.
- **분량은 글자 수 기준** — 공백 포함(기본)/공백 제외/단어 수 중 선택. 헤더·목표·집필 현황이 같은 단위를 쓴다.
- **연재 도구** — 회차 분량표(플랫폼 프리셋), 오늘 쓴 분량·연속 집필일, 독자 뷰 미리보기, 고유명사 사전·표기 흔들림 검사·문장 진단, 코르크보드·연표, 스냅샷(버전), 리서치 노트.
- **내보내기·백업** — TXT·마크다운·DOCX(회차별/작품 전체), 전체 백업 JSON 내보내기·복원.
- **PWA** — 홈 화면 설치, 오프라인에서도 열림(프로덕션 빌드). 저장 공간 보호 요청.
- **다크/라이트 테마** 토글.

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) · React 19 |
| 저장소 | 브라우저 IndexedDB (`idb`) — 백엔드·DB·로그인 없음 |
| 데이터 페칭 | SWR (IndexedDB를 fetcher로) |
| 에디터 | Tiptap (ProseMirror) + StarterKit |
| 스타일 | Tailwind CSS + 원티드 디자인 토큰(CSS 변수 SSOT) · Pretendard |
| 테스트 | Vitest(단위) · Playwright(E2E) · GitHub Actions CI |
| 내보내기 | `docx`(DOCX), Blob 다운로드(TXT·MD) |

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
| `npm test` | Vitest 단위 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 |
| `node scripts/make-icons.mjs` | PWA 아이콘·OG 이미지 재생성(sharp) |

배포 시 `NEXT_PUBLIC_SITE_URL`에 실제 도메인을 넣으면 OG·robots·sitemap이 그 주소를 쓴다.

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

## 범위

로그인·서버 동기화는 만들지 않습니다(로컬 우선 원칙). 온디바이스 AI 문답은 실용성 부족으로 제거했습니다(2026-09). 변경 이력은 `CLAUDE.md`, 상세 기록은 `docs/worklogs/`를 보세요.
