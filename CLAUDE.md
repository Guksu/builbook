# builbook

웹소설 집필 에디터 사이트. 레퍼런스는 스크리브너이되 **진입장벽을 낮춘** 도구.

**스택(로컬 우선 / local-first):** Next.js(App Router) · **IndexedDB**(클라이언트 저장, `idb`) · Tiptap(ProseMirror) · **Tailwind + 원티드 디자인 토큰**(Pretendard 폰트). 원티드 컴포넌트 패키지(`@wanteddev/wds`)는 쓰지 않고 토큰 값만 차용. **백엔드·DB·로그인 없음** — 모든 데이터는 브라우저 IndexedDB에 보관.

**MVP-1 범위:** 문서 트리 + 에디터 + 자동저장 (Project·Document, 로컬). 로그인/User·Character·Snapshot 없음. 데이터 계층은 `src/shared/db`(idb) + entities 훅(SWR).

**AI 문답(온디바이스):** Transformers.js를 **Web Worker**에서 구동하는 브라우저 추론. "기능 사용" 버튼으로 모델을 **브라우저에 다운로드**한 뒤 추론한다. 백엔드/서버가 없으므로 **SSE 불가** — 토큰은 worker→메인 `postMessage`로 스트리밍(SSE와 UX 동일). 엔진은 `src/shared/ai`, 상태는 `src/features/ai-chat`, 패널은 `src/widgets/ai-assistant`.

> 참고: 백엔드 하네스 에이전트/스킬(backend-engineer·data-modeler, nextjs-api·prisma-data-model)과 오케스트레이터 Phase 3는 현재 **휴면**(local-first 전환으로 미사용). 추후 동기화/서버 도입 시 재가동.

**프론트 컨벤션:** Feature-Sliced Design(FSD). Next `app/`은 라우팅 전용 얇은 래퍼, 화면 로직은 `src/`(views·widgets·features·entities·shared). 별칭 `@views @widgets @features @entities @shared @app`. 서버 인프라(`lib/`·`app/api`·`middleware`)는 FSD 밖.

## 하네스: 웹소설 에디터 빌드

**목표:** 스크리브너의 본질(문서 트리 + 집중 글쓰기)을 입문 작가도 5분 안에 쓸 수 있게 단순화한 에디터를, 에이전트 팀으로 설계·구현·검증한다.

**트리거:** 에디터 사이트 빌드·기능 추가·화면/API 구현·수정·재실행 등 이 제품 관련 작업 요청 시 `webnovel-editor-orchestrator` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**핵심 규약 (경계면 버그 예방):**
- API 컬렉션 응답은 항상 `{ items: T[] }` → 프론트 훅은 `.items`로 unwrap.
- 필드명은 DB→API→프론트 전 구간 camelCase 통일.
- 모든 `href`/`router.push`는 실제 `app/` page 경로와 매칭(route group 접두사 주의).

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-03 | 초기 구성 (에이전트 7 + 스킬 7 + 오케스트레이터) | 전체 | - |
| 2026-06-03 | MVP-1 범위 축소 (Character·Snapshot 백로그) | product-spec, prisma-data-model, nextjs-api, tiptap-editor, orchestrator, 관련 에이전트 | 사용자 피드백: 문서트리+에디터+자동저장만 시작 |
| 2026-06-03 | 디자인 시스템 = Tailwind + 원티드 토큰(공개 소스 실값) + Pretendard 확정. WDS 컴포넌트 패키지 미사용 | wanted-design-system(스킬+레퍼런스), design-system-specialist, nextjs-frontend | 사용자 명확화: 토큰만 차용, 컴포넌트는 Tailwind 자체 구현 |
| 2026-06-03 | 프론트 FSD 컨벤션 채택 + 기존 프론트 src/ 레이어로 리팩터링 | nextjs-frontend 스킬, 프론트 전체(src/), tsconfig paths | 사용자 요청: FSD 컨벤션 사용 |
| 2026-06-03 | **로컬 우선 전환**: 로그인·백엔드·Postgres/Prisma 제거, IndexedDB(idb)로 데이터 저장 | 인증/api/prisma/middleware 삭제, shared/db 신설, entities 훅 재작성 | 사용자 결정: 로그인 없애고 IndexedDB 사용 (인증 진입장벽 제거) |
| 2026-06-06 | **AI 문답 도메인 추가**: 에이전트 `ai-inference-engineer` + 스킬 `client-ai-inference` 신설, 오케스트레이터에 AI 빌드 흐름 추가 및 스택 drift(Postgres/Prisma→local-first) 정정 | ai-inference-engineer, client-ai-inference, webnovel-editor-orchestrator, CLAUDE.md | 사용자 요청: Transformers.js 온디바이스 AI 문답(사이드바, "기능 사용" 게이팅, postMessage 스트리밍). assignment(회사 코드)는 엣지케이스/개념만 참조, 구조 미복제 |
