# builbook

웹소설 집필 에디터 사이트. 레퍼런스는 스크리브너이되 **진입장벽을 낮춘** 도구.

**스택:** Next.js 풀스택(App Router) · Postgres + Prisma · Auth.js · Tiptap(ProseMirror) · **Tailwind + 원티드 디자인 토큰**(Pretendard 폰트). 원티드 컴포넌트 패키지(`@wanteddev/wds`)는 쓰지 않고 토큰 값만 차용(컬러·스페이싱은 공개 소스 실값).

**MVP-1 범위:** 문서 트리 + 에디터 + 자동저장 (User·Project·Document). Character·Snapshot은 백로그.

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
