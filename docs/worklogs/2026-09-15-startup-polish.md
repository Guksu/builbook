# 스타트업 완성도 루프 (기반·AI 제거·집필 경험·배포)

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-09-15 |
| 작성 | Claude |
| 관련 경로 | `.github/workflows`, `app/`, `public/`, `src/features/{storage-guard,tab-guard,count-unit,find-replace,binder-tree,export-document}`, `src/entities/{document,writing-log}`, `src/widgets/{binder,editor,stats-panel}`, `src/views/landing`, `docs/loops/2026-09-15-startup-polish.md` |

## 1. 개요

사용자가 "실제 스타트업 제품처럼 개선"을 요청했다. 컨셉(로그인 없음·로컬 저장·낮은 진입장벽)은 그대로 두고 완성도를 올리는 방향으로 합의했고, 온디바이스 AI 문답은 사용자 테스트에서 실용성이 부족해 제거하기로 했다(A안). 대상 사용자는 한국 웹소설 연재 작가로 확정해 분량 단위를 글자 수 기준으로 통일했다. 사이드바는 옵시디언 파일 탐색기를 참고했다. 단계별 루프로 진행하고 각 단계는 검증 통과 후 main에 직접 올렸다(명세: `docs/loops/2026-09-15-startup-polish.md`).

## 2. 작업내용

### 1단계 기반 다지기
- `.github/workflows/ci.yml` — lint·tsc·vitest·build 뒤 Playwright e2e. 실패 시 리포트 업로드.
- `package-lock.json` — `npm ci`가 EUSAGE(`@emnapi/*` 누락)로 실패하던 것을 동기화.
- e2e 실패 2건 수정. 헤더 리디자인 후 "N단어"가 두 곳이라 locator가 겹치던 것(`main` 범위로 한정). 한글 다운로드 파일명이 "download"로 바뀌던 것은 **컨테이너에 UTF-8 로케일이 없어서**였다(실측: `LANG=C.UTF-8`이면 통과) → `playwright.config.ts`에서 `LANG`/`LC_ALL` 기본값 지정, CI에도 env 지정.
- `app/error.tsx`·`app/not-found.tsx` — 흰 화면 대신 복구 동선.
- `src/features/storage-guard` — `navigator.storage.persist()` 요청 + 사용량 한 줄 안내(대시보드). 판정은 순수 함수 `summarizeStorage`.
- `src/features/tab-guard` — BroadcastChannel로 같은 문서를 다른 탭에서 열면 경고 배너. 메시지 판정은 순수 함수(`protocol.ts`).

### 2단계 온디바이스 AI 제거
- `src/shared/ai`·`src/features/ai-chat`·`src/widgets/ai-assistant` 삭제, `@huggingface/transformers` 제거(패키지 34개 감소).
- 헤더 "AI 문답" 칩·우측 패널 제거. CLAUDE.md에 결정·사유 기록, AI 하네스(에이전트·스킬·오케스트레이터 AI 흐름·`_workspace/08`) 휴면 표기.
- 사유: 0.6B 모델 한국어 품질, 919MB 첫 다운로드, 그리고 `useAiChat.send()`가 대화 기록만 보내고 원고는 보지 못하는 구조("이 문단을 고쳐줘"가 불가능).

### 3단계 집필 경험
- **분량 단위 통일** — `@shared/lib`에 `measureText`(단어·공백 포함 글자·공백 제외 글자를 한 번에)·`CountUnit`·`formatCount`. `DocumentNode`에 `charCount`·`charCountNoSpace` 저장(옛 레코드는 `measureDocument`가 본문에서 재계산). 집필 기록(`writingLogs`)에 `netChars`·`writtenChars` 병행 기록, 통계 함수는 단위 인자를 받는다(옛 기록은 단어 수로 대체 — 정확하진 않다). `features/count-unit`이 설정(localStorage)과 선택 UI(인스펙터). 헤더·에디터·목표·집중 모드·현황·코르크보드·스냅샷 표기가 모두 설정 단위를 따른다. 기본은 공백 포함 글자 수.
- **회차 분량 프리셋** — `EPISODE_PRESETS`(일반 5,000자·기본 5,500자·노벨피아 최소 3,000자 공백 제외). 각 값에 근거를 적었고, 공식 페이지를 이 환경에서 열 수 없어 "검색 요약"인 항목은 그렇게 표시했다. 프리셋을 고르면 단위 설정도 함께 바뀐다. 문피아는 자료가 4,000자/5,000자로 엇갈려 넣지 않았다.
- **첫 작품 템플릿** — 작품을 만들면 `seedFirstEpisode`가 "1화" 문서를 만든다. 새 문서 기본 이름은 `nextEpisodeTitle`("N화" 다음 번호).
- **마지막 문서 복원** — 작업실에 다시 들어오면 마지막에 열었던 문서(localStorage)에서 이어 쓴다.
- **옵시디언식 바인더** — `src/widgets/binder` 전면 재작성. 상단 아이콘 4개(새 문서·새 폴더·정렬·모두 접기/펼치기), 새 문서는 다이얼로그 없이 "N화"로 즉시 생성 후 인라인 이름 편집, 더블클릭·F2 이름 변경, 우클릭/… 메뉴(하위 생성·이름 변경·삭제), 폴더 접기(작품별 localStorage `builbook:binder-collapsed:*`), 정렬(바인더 순서/이름순/수정순, 세션 상태), 키보드 이동(↑↓ Enter ←→), `role=tree` 접근성, 드래그 재정렬 유지. 순수 로직은 `src/features/binder-tree/lib`(정렬·펼침 평탄화·접힘 직렬화, 테스트 15개). 공용 `src/shared/ui/ContextMenu.tsx` 추가. `PromptModal`은 소비처가 없어져 삭제.
- **에디터 도구** — `@tiptap/extension-placeholder`로 빈 문서 안내, 최소 툴바(굵게·기울임·취소선·인용·구분선·되돌리기·다시하기, `aria-pressed`), 단축키 안내 모달(mac은 ⌘ 표기), 찾기·바꾸기(`src/features/find-replace`: 순수 검색/치환 계획 + ProseMirror Decoration 하이라이트, Ctrl/⌘+F는 본문 포커스일 때만 가로챔, 문단을 넘는 검색어는 의도적으로 미지원), 제목 인라인 수정(클릭/F2, Enter 저장·Esc 취소). e2e `editor-tools.spec.ts` 6개.
- **CSS 토큰 버그** — `.prose-editor`가 쓰던 `--space-*` 변수가 `:root`에 없어 문단 간격·리스트 들여쓰기가 무효였다. `:root`에 스페이싱 토큰(4~32px)을 정의.

### 4단계 배포·유통
- **PWA** — `app/manifest.ts`, `public/sw.js`(정적 자산 캐시 우선, 페이지·데이터는 네트워크 우선·실패 시 캐시, 처음 여는 작업실 주소는 대시보드로 대체), `src/app/sw-register.tsx`(프로덕션에서만 등록). 아이콘·OG 이미지는 `scripts/make-icons.mjs`(sharp)로 생성해 커밋.
- **검색 메타** — `app/layout.tsx` metadata(OG·트위터·아이콘·manifest), `app/robots.ts`(작업실 `/projects/`는 색인 제외), `app/sitemap.ts`. 도메인은 `NEXT_PUBLIC_SITE_URL` 환경변수(`src/shared/config/site.ts`).
- **랜딩** — 기능 6개·시작 흐름 3단계·FAQ 4개·마무리 CTA. 정적 서버 컴포넌트.
- **DOCX 내보내기** — `docx` 패키지. `features/export-document/lib/docx.ts`(순수 변환 + 패킹), 내보내기 모달에 현재 문서/작품 전체 DOCX 버튼. 서식은 제목+문단 최소.
- **반응형** — md(768px) 미만에서 바인더는 헤더 버튼("바인더")으로 여는 드로어, 우측 패널은 헤더 아래 오버레이(헤더는 가리지 않아 칩으로 닫는다). 헤더는 좁은 화면에서 가로 스크롤, sm 미만에서 합계·본문/카드 라벨 숨김. e2e `responsive.spec.ts`(390px 폭) 2개.

### 루프 2 — 스크리브너 참고 UI/UX (같은 날, 명세 `docs/loops/2026-09-15-scrivener-ux.md`)
- **선행 수정**: 폴더 안 문서를 최상위로 못 꺼내던 문제. `planMoveToParent`(순수), 메뉴 "한 단계 위로/최상위로 이동", 폴더 위쪽 1/3 드롭=폴더 앞, 트리 아래 빈 공간 드롭=최상위.
- **스크리브닝 연속 보기** — `src/widgets/scrivenings`. 바인더에서 폴더를 클릭(또는 Enter)하면 선택되고, 가운데에 자손 회차들이 순서대로 이어져 각각 편집·자동저장된다. 접기는 chevron·←/→만. 구획마다 "이 문서만 열기". 자손 수집은 `collectDescendantDocs`(entities/document).
- **라벨·상태·메모** — `Project.labels`(기본: 시점: 주인공/시점: 히로인/복선/수정 필요, 색 8종은 `--label-*` 변수), `DocumentNode.label`·`note`. 인스펙터에 상태(초고/퇴고/완료) select·라벨 select·라벨 관리·메모. 바인더 행에 라벨 색 막대와 상태 점, 코르크보드 카드에 색 띠. 상태 값의 단일 출처는 `features/corkboard`.
- **목표 바 + 마감일 + 빠른 열기** — 헤더 `GoalBar`(작품·오늘 진행 막대, "마감까지 N일 · 하루 N자"), `Project.deadline`과 `paceToDeadline`(오늘 포함 올림), 인스펙터 마감일 입력. `features/quick-open`: Ctrl/⌘+P → 제목 검색(시작 일치 > 단어 시작 > 포함, 같으면 최근 수정 순) → Enter로 열기.
- **문서 템플릿** — `DocumentNode.kind`(episode/character/setting, 회차는 저장 안 함), `buildTemplateContent`로 인물·설정 카드 틀. 바인더 "카드 템플릿" 버튼과 우클릭 메뉴("새 인물 카드"/"새 설정 카드"). 회차 분량표·TXT/MD/DOCX 내보내기는 `isManuscript`로 카드를 뺀다. 행 제목 옆에 종류 표시.

## 3. 주의사항

- **e2e 버튼 이름 규칙**: Playwright `getByRole(name)`은 부분 일치라 새 버튼 이름에 기존 이름("새 문서" 등)을 포함하면 기존 스펙 27개가 한꺼번에 깨진다(실제로 겪음). 새 버튼은 겹치지 않는 이름으로.
- **폴더 선택**: 이제 폴더 클릭은 접기가 아니라 선택(연속 보기)이다. 접기는 chevron과 ←/→ 키.
- **카드 문서는 원고가 아니다**: `kind`가 character/setting이면 회차 분량표·내보내기에서 빠진다. 코르크보드·검색·백업에는 포함된다.

- **F2 키**: 에디터가 window에 F2 리스너를 달아 제목 편집을 연다. 바인더는 자기 F2 처리에서 `stopPropagation`으로 막는다. 에디터 리스너를 capture 단계로 바꾸면 바인더 인라인 편집이 깨진다.
- **docx 패키지는 배럴에서 재수출하지 말 것**: `features/export-document/index.ts`에서 재수출하면 작업실 첫 로드가 +100KB(실측 240→344KB)가 된다. `ExportMenu`가 버튼 클릭 시 `import("../lib/docx")`로 가져온다.

- **집필 기록 단위**: 2026-09-15 이전 기록은 단어 수만 있다. 글자 단위로 볼 때 그 날들은 단어 수가 그대로 보인다(과소 표시). 되돌릴 방법은 없다(본문 이력이 없다).
- **분량 단위는 브라우저 전체 설정**이고 목표(문서·작품·하루·회차) 숫자는 단위를 바꿔도 자동 환산되지 않는다. 입력 칸 옆에 현재 단위를 표시한다.
- **서비스 워커**: 캐시 이름 `VERSION`을 올려야 옛 캐시가 지워진다. 배포 뒤 화면이 옛것으로 보이면 이 값을 의심할 것. 처음 여는 작업실 주소는 오프라인에서 열리지 않는다(대시보드로 대체).
- **e2e 환경**: 이 컨테이너는 Playwright가 기대하는 Chromium 리비전이 없어 `pw.local.config.ts`(로컬 전용, git 제외)로 사전 설치 Chromium을 지정해 돌렸다. CI는 `playwright install`로 정식 경로를 쓴다.
- **플랫폼 분량 기준**은 바뀐다. `EPISODE_PRESETS`의 `source`를 갱신하면서 값을 고칠 것.
