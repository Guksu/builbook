# builbook

웹소설 집필 에디터 사이트. 레퍼런스는 스크리브너이되 **진입장벽을 낮춘** 도구.

**스택(로컬 우선 / local-first):** Next.js(App Router) · **IndexedDB**(클라이언트 저장, `idb`) · Tiptap(ProseMirror) · **Tailwind + 원티드 디자인 토큰**(Pretendard 폰트). 원티드 컴포넌트 패키지(`@wanteddev/wds`)는 쓰지 않고 토큰 값만 차용. **백엔드·DB·로그인 없음** — 모든 데이터는 브라우저 IndexedDB에 보관.

**MVP-1 범위:** 문서 트리 + 에디터 + 자동저장 (Project·Document, 로컬). 로그인/User·Character·Snapshot 없음. 데이터 계층은 `src/shared/db`(idb) + entities 훅(SWR).

**AI 문답: 제거됨(2026-09-15).** 온디바이스 Transformers.js 문답은 사용자 테스트에서 실용성 부족(0.6B 모델 한국어 품질, 919MB 다운로드, 원고를 못 보는 구조)으로 제거했다. 규칙 기반 도구(표기 흔들림 검사·문장 진단)는 유지. 재도입하려면 사용자 API 키 기반 클라우드 호출(서버 없음 유지)이 후보이며, 제품 결정 후 진행한다.

> 참고: 백엔드 하네스 에이전트/스킬(backend-engineer·data-modeler, nextjs-api·prisma-data-model)과 오케스트레이터 Phase 3, 그리고 **AI 하네스(ai-inference-engineer·client-ai-inference, 오케스트레이터 "AI 문답 기능 빌드")**는 현재 **휴면**(미사용). 추후 동기화/서버·AI 재도입 시 재가동.

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
| 2026-07-20 | **완성 루프 + 가드레일 구성**: 루프 명세 `docs/loops/webnovel-editor-completion.md`(백로그 5항목, 예산 2M·최대 10반복·막힘 3연속), 훅 4종(git 차단·시크릿 차단·branchGuard·verifierGate) + settings.json(deny/allow) 등록, 공통 템플릿 6종 `docs/templates/` 배포 | .claude/hooks, .claude/settings.json, docs/ | 사용자 요청: "완벽한 웹소설 에디터로 완성, 루프로 진행" — loop 스킬 4요소·안전장치 사용자 확인(2026-07-20) |
| 2026-07-29 | **집필 도구 4종 세트 추가**: 백업·복원(전체 JSON, 병합/전체교체) · 연재 실전(일별 집필량·연속 집필일·회차 분량표·독자 뷰) · 구조 설계(코르크보드+진행 상태, 타임라인) · 설정 일관성(고유명사 사전, 표기 흔들림 검사, 문장 진단). IndexedDB v3→v6(writingLogs·events·terms), 텍스트 유틸을 `@shared/lib`으로 이관 | shared/db·shared/lib, entities/{writing-log,story-event,term}, features/{backup-restore,writing-stats,reader-preview,corkboard,consistency-check}, widgets/{stats-panel,corkboard,timeline-panel,consistency-panel} | 사용자 요청: "본격 집필 전 필요한 툴 추가" — 4개 묶음 전부 선택. 상세: `docs/worklogs/2026-07-29-writing-tools.md` |
| 2026-09-15 | **스타트업 완성도 루프(4단계 완료)**: ① 기반(CI·에러 화면·저장 공간 보호·다중 탭 경고) ② 온디바이스 AI 제거(AI 하네스 휴면) ③ 집필 경험 — 분량 단위를 **글자 수 기준**으로 통일(`features/count-unit`, `charCount` 저장), 회차 분량 프리셋, 첫 작품 "1화" 자동 생성·"N화" 자동 번호, **옵시디언식 바인더**(`features/binder-tree`), 에디터 툴바·placeholder·찾기/바꾸기(`features/find-replace`)·제목 인라인 수정 ④ 배포 — PWA(manifest·`public/sw.js`), OG/robots/sitemap, 랜딩 개편, DOCX 내보내기, 반응형 | .github, app, public, src 전반 | 사용자 결정: "실제 스타트업 제품처럼 개선", AI는 실용성 부족으로 제거(A안), 컨셉(로그인 없음·로컬 저장) 유지, 사이드바는 옵시디언 참고, 대상은 한국 웹소설 연재 작가. 명세: `docs/loops/2026-09-15-startup-polish.md`, 기록: `docs/worklogs/2026-09-15-startup-polish.md` |
| 2026-09-15 | **스크리브너 참고 UI/UX 루프**: 폴더 안 문서 최상위 이동(메뉴·드롭 규칙), 스크리브닝 연속 보기(`widgets/scrivenings`), 라벨·상태·문서 메모(`Project.labels`, 인스펙터·바인더·코르크보드), 헤더 목표 바·마감일 페이스·빠른 열기(`features/quick-open`), 문서 템플릿(인물·설정 카드, `DocumentNode.kind`) | src/{widgets,features,entities}, 인스펙터·바인더·헤더 | 사용자 요청: "편의성·UI 개선, 폴더 안 문서를 최상위로, 스크리브너 참고" — 항목은 문답으로 선택. 명세: `docs/loops/2026-09-15-scrivener-ux.md` |
| 2026-06-06 | **AI 문답 도메인 추가**: 에이전트 `ai-inference-engineer` + 스킬 `client-ai-inference` 신설, 오케스트레이터에 AI 빌드 흐름 추가 및 스택 drift(Postgres/Prisma→local-first) 정정 | ai-inference-engineer, client-ai-inference, webnovel-editor-orchestrator, CLAUDE.md | 사용자 요청: Transformers.js 온디바이스 AI 문답(사이드바, "기능 사용" 게이팅, postMessage 스트리밍). assignment(회사 코드)는 엣지케이스/개념만 참조, 구조 미복제 |
