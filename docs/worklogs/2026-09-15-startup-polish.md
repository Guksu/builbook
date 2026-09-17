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

### 루프 3 — 필터·범위·다중 선택·컴파일 (명세 `docs/loops/2026-09-15-scrivener-ux-2.md`)
- **바인더 다중 선택** — Ctrl/⌘ 클릭 토글, Shift 클릭 범위(보이는 순서), 선택 바("N개 선택 · 휴지통 · 최상위로 · 해제"), 우클릭 메뉴 다중 항목, 다중 드래그. 폴더와 그 자손을 함께 고르면 폴더만 옮긴다(`dropDescendants`). `deleteDocuments(ids)`는 서브트리 합집합을 한 번에 소프트삭제.
- **라벨 필터** — 바인더(`filterTreeByLabel`, 조상 폴더 유지·자동 펼침)와 코르크보드(`filterCardsByLabel`, 폴더 카드 제외). 둘 다 세션 상태.
- **코르크보드 폴더 범위** — 폴더를 고른 채 카드 보기로 가면 그 폴더의 자손 카드만. 툴바에 "보는 범위 · 전체 보기 · 라벨".
- **컴파일 옵션** — `compileManuscript`가 회차 범위(원고만 1부터 셈)·구분선(없음/빈 줄/`* * *`)·회차/폴더/작품 제목 포함을 해석해 섹션 목록을 만들고 TXT·MD·DOCX가 공통 소비. 회차가 없는 폴더는 빠진다.

### 루프 4 — 설정 기억·카드 크기·컴파일 프리셋 (명세 `docs/loops/2026-09-15-scrivener-ux-3.md`)
- **화면 설정 기억** — `@shared/lib` `readJson/writeJson/isOneOf` + `@shared/ui` `usePersistedState(key, initial, guard)`. 첫 렌더는 기본값, 마운트 뒤 저장값(hydration 안전). 바인더 정렬(`builbook:binder-sort:*`)·라벨 필터(`builbook:binder-label-filter:*`), 코르크보드 라벨 필터(`builbook:card-label-filter:*`)·카드 크기(`builbook:card-size:*`)가 작품별로 남는다.
- **카드 크기** — 작게/보통/크게(격자 열 수·시놉시스 line-clamp). 툴바 세그먼트.
- **컴파일 프리셋** — `Project.compilePresets`(작품 데이터라 백업 파일에 자동 포함). 내보내기 모달에서 현재 옵션을 이름 붙여 저장, 고르면 옵션 복원, 삭제. 최대 12개(오래된 것부터 버림).

### 루프 4 반복 2 — CI 수정 + 후속 3건
- **CI 실패 원인**: `@tiptap/extension-placeholder`가 에이전트 작업 중 `package.json`·lock에 남지 않았다(로컬 node_modules에는 설치돼 있어 로컬 검증은 전부 통과). CI의 `npm ci` 뒤 tsc가 모듈을 못 찾아 실패. 의존성을 선언해 CI run #9부터 성공.
- **코르크보드 밖으로 끌기** — 보드 아래 점선 영역에 카드를 놓으면 범위 폴더 밖(전체 보기면 최상위)으로. 바인더 빈 공간 드롭과 같은 규약(`onMoveToParent`).
- **Alt+S** — 현재 문서 상태를 초고→퇴고→완료로 돌린다. 단축키 안내 모달에 Ctrl/⌘+P·Alt+S 추가.
- **프리셋 백업** — 컴파일 프리셋은 `Project.compilePresets`에 있어 전체 백업 JSON에 자동 포함된다(별도 형식 없음). README에 명시.

### 루프 5 (2026-09-16) — UX 다듬기 (명세 `docs/loops/2026-09-16-ux-polish.md`)
- **작업실 코드 분할** — `src/views/workspace/model/`(selection·panels·documentActions·shortcuts·progress 훅, `types.ts`) + `ui/`(Main·SidePanels·BinderPane·Overlays). `WorkspacePage.tsx`는 조립만(157줄). 컴포넌트에는 `selection`·`panels`·`docs`·`projectApi` 묶음으로 전달(개별 prop 25개+ 방지).
- **탭 닫기 저장 보강** — `useAutosave`: `pagehide`에 대기 중 본문을 localStorage(`builbook:doc-backup:*`)에 동기로 남기고 flush 시도, IndexedDB 쓰기 중에만 `beforeunload` 확인. `Editor`는 열릴 때 `readBackup`으로 되살려 저장하고 토스트. 스크리브닝 구획은 백업만 남기고 복구는 단일 편집기에서 한다.
- **본문 표시 설정** — `features/focus-settings`(글자 크기 4단·줄 간격 3단·폭 3단·타이프라이터). 브라우저 전체 설정(localStorage). 에디터는 CSS 변수(`--editor-font-size`·`--editor-line-height`)로 받는다 — 클래스(`text-body`)로 두면 설정이 못 이긴다. 집중 모드에서는 제목·툴바가 hover/포커스 때만 보이고, 타이프라이터가 켜지면 커서 줄을 `main` 스크롤 가운데로.
- **UX 감사 수정** — Tailwind spacing에 `28`·`36` 추가(`h-28`을 쓰던 select·input이 높이 없이 늘어나던 버그), 저장 공간 미보호 안내를 경고색에서 일반 안내로, 헤더 칩 꺼진 점 숨김, 휴지통 이동 "되돌리기" 토스트(`Toast`에 action 지원), Alt+S 리스너 ref화, 탭 가드 문서 한정.

### 루프 6 (2026-09-17) — 작업실 냄새 정리 + 헤더 정비 (명세 `docs/loops/2026-09-17-workspace-smells.md`)
- **선택 복원 한 패스** — `useWorkspaceSelection`: 선택 문서가 살아 있으면 그대로, 아니면 마지막 문서→첫 문서를 한 번에 고른다.
- **여러 개 이동 롤백** — `handleMoveManyToParent`: 실패 시 앞서 옮긴 항목을 역순으로 원래 자리로. 롤백까지 실패하면 토스트로만 알린다.
- **인스펙터 탭 접근성** — `id`/`aria-controls`/`role=tabpanel`/`aria-labelledby`.
- **`useDocuments` 안정화** — 액션 묶음을 `useMemo([projectId, mutate])`로. 그래서 액션 안에서는 `allDocuments`(SWR 캐시) 대신 `dbGetAllByProject`로 읽는다(휴지통 이동·복원·영구 삭제·라벨 정리). 소비처의 리스너·memo가 렌더마다 깨지지 않는다.
- **헤더 정비(사용자 요청)** — 칩 7개를 "패널" 메뉴(열린 수 배지, `menuitemcheckbox`)로, 미리보기·내보내기·테마 전환은 "더 보기" 메뉴로. 인스펙터와 집중만 밖에 남김. `ContextMenu`에 `checkbox`·`disabled` 추가. e2e는 `패널` 버튼 → `menuitemcheckbox`, `더 보기` → `menuitem` 경유로 바꿨다(12개 스펙).

### 루프 7 (2026-09-17) — 패널 단축키·열린 패널 기억 (명세 `docs/loops/2026-09-17-panel-shortcuts.md`)
- **열린 패널 기억** — `useWorkspacePanels`가 패널 7종을 `Record<WorkspacePanelKey, boolean>` 하나로 들고 작품별 localStorage에 저장. `panelSetters`는 함수형 갱신을 ref로 풀어 기존 시그니처(`Dispatch<SetStateAction<boolean>>`) 유지.
- **패널 단축키** — Ctrl/⌘+Shift+1~7(연표·현황·점검·검색·리서치·휴지통·인스펙터). `e.code`(Digit/Numpad)로 판별해 키보드 배열과 무관. 메뉴 항목 오른쪽에 힌트(`ContextMenu.hint`), 인스펙터 칩 title, 단축키 안내 모달에 표기.
- **e2e 영향** — 새로고침 뒤 패널을 다시 열던 테스트는 이제 "열려 있음"을 전제로 한다.

### 루프 8 (2026-09-17) — 영감 서랍: 아이디어 얻기 (명세 `docs/loops/2026-09-17-idea-drawer.md`, 설계 `docs/specs/2026-09-17-idea-feature.md`)
- **1층 오프라인** — `features/idea-cards`: 장르 6개(현판·로판·무협·현대·SF·공포) × 60장 상황 카드(태그 6종 × 10장, `data/*.ts`, 형식은 `decks.test.ts`가 검수), `drawCards`(고정 카드 유지·직전과 겹침 방지·태그 분산, 난수 주입), 질문 카드 12개, 조합기 `buildCombo`(바인더의 인물/설정 카드 제목 × 사건 유형 16개, 이/가 조사 처리).
- **아이디어 메모** — `entities/idea`(IndexedDB v7 `ideas` 스토어, `by-project`), 작품 삭제 cascade, 백업 형식에 `ideas` 추가(옛 백업 파일은 빈 배열로 읽힘). 메모는 저장 시점의 선택 회차에 붙는다(문서가 지워져도 메모는 남음).
- **2층 AI** — `shared/ai-client`: 모델 표(Opus 5 / Sonnet 5, 단가), 키 보관(`keyStore`: 세션 메모리 기본, 선택 시 localStorage, `useSyncExternalStore`), SDK 래퍼(`streamCompletion`·`countInputTokens`·`classifyAiError`). SDK는 `import()`로 지연 로드해 작업실 첫 로드 번들에 들어가지 않는다. `features/idea-ai`: 맥락 조립(`buildContext`: 선택 문단 > 현재 회차, 본문 끝 8,000자·부속 1,000자 상한), 프롬프트 6종(`prompts.ts`, 시스템 프롬프트 고정·`cache_control`), 상태 머신(`reducer.ts`: no-key/ready/confirm/streaming/done/error, 401은 키 지우고 이유 보존), 훅 `useIdeaAi`(AbortController 중단, 언마운트 시 중단).
- **에디터 선택 공유** — `features/editor-selection`(작은 외부 스토어). 에디터가 `selectionUpdate`/`blur`에 선택 텍스트를 publish, AI 탭이 구독. 묘사 다듬기·대사 대안은 선택이 있을 때만 켜진다.
- **패널** — `widgets/idea-panel`(뽑기/AI/메모 탭). 헤더 패널 메뉴 7번째 "영감", Ctrl/⌘+Shift+7(인스펙터는 8로 이동). `Project.genre`(덱 선택), `Project.aiModel`(모델) 저장.
- **e2e** — `idea-drawer.spec.ts` 5개: 카드 뽑기·고정·장르 기억, 메모 저장·새로고침, 조합기 게이팅, AI 흐름(Anthropic 응답을 `page.route`로 SSE 흉내 — 미리보기 토큰 수·스트리밍 결과·전송 본문 검증·키가 본문에 없음), 401 처리.
- **번들** — 작업실 첫 로드 254KB → 280KB(카드 덱·패널 UI 포함, SDK 제외).

### 루프 9 (2026-09-17) — 인물 관계도 (명세 `docs/loops/2026-09-17-relation-map.md`)
- **데이터** — `entities/relation`(IndexedDB v8 `relations`, `by-project`): `fromId/toId`(인물 카드 문서 id)·`type`·`fromLabel`(A→B)·`toLabel`(B→A)·`note`. 두 인물 사이 관계는 방향 무관 1개(`findRelationBetween`). 배치는 `Project.relationLayout`(문서 id → 좌표), 드래그를 놓을 때 한 번 저장. 작품 삭제·인물 카드 영구 삭제 시 관계선 cascade, 백업 형식에 `relations` 추가.
- **기하** — `features/relation-map/lib/geometry.ts`: 원형 자동 배치(`circleLayout`, 인물 수에 따라 반지름), 저장 배치 병합(`resolveLayout`: 없는 인물은 자동 자리, 지운 인물 좌표는 버림), 선 끝을 노드 테두리에서 자름(`clipToRect`), 라벨 자리(종류 라벨은 선 가운데에서 법선 방향 14px, 방향 라벨은 반대쪽·끝에서 40px 안쪽 — 원형 배치의 마주 보는 두 선이 한 중심을 지나도 라벨이 겹치지 않게).
- **캔버스** — `widgets/relation-map/RelationCanvas`: SVG + 포인터 이벤트(캡처). 노드 드래그는 로컬 상태로 움직이고 놓을 때 저장. 노드 오른쪽 손잡이(circle)에서 시작해 다른 노드 위에서 놓으면 `onConnect`. 선은 투명한 굵은 선을 겹쳐 클릭 영역 확보, `role="button"`으로 키보드 접근. 화살표는 방향 라벨이 있는 쪽에만.
- **결합** — 헤더 가운데 전환 3단(본문·카드·관계), `WorkspaceViewMode`를 헤더가 정의하고 views가 재수출. 빈 상태에서 "첫 인물 카드 만들기"(템플릿 본문으로 생성).
- **e2e** — `relation-map.spec.ts` 3개: 빈 상태→첫 카드, 손잡이 드래그→폼→선·라벨·요약·새로고침·재연결 시 고치기·삭제, 노드 드래그 저장·자동 배치 복귀.

### 루프 10 (2026-09-17) — 인물 관계도 후속 4건 (명세 `docs/loops/2026-09-17-relation-map-2.md`)
- **손잡이 터치** — 보이는 원(반지름 7)은 그대로 두고, 그 위에 반지름 20의 투명 원을 겹쳐 누르기 영역만 넓혔다(약 40px = 손가락 크기). SVG에 `touch-action: none`을 줘 드래그가 스크롤로 새지 않게 했다.
- **색** — 관계 종류별 색 키 `RELATION_TYPE_COLOR`(가족 green·연인 pink·적 red·동료 blue·스승 purple·라이벌 orange·직접 입력 gray)는 라벨 색 이름과 같아 화면이 `--label-*` 토큰 하나를 공유한다. 선은 `<g class="text-label-*">` + `stroke="currentColor"`, 노드는 인물 카드의 라벨 색을 왼쪽 띠(`fill-label-*`)로. Tailwind가 클래스를 만들도록 문자열 표(`widgets/relation-map/lib/colors.ts`)에 리터럴로 둔다. 라벨 목록이 저장된 적 없는 작품은 `withDefaultLabels`로 기본 라벨을 써야 한다(첫 e2e에서 색 띠가 안 나온 원인).
- **목록 보기** — 툴바 "도표 | 목록" 전환(`builbook:relation-view:*`에 기억). 표는 인물·종류(색 점)·상대·→·←·최근 변화·메모. 줄을 누르면 같은 폼으로 고친다.
- **회차별 변화** — `Relation.changes?: { documentId, note }[]`(별도 스토어 없음 — 관계와 함께 지워지고 백업된다). 회차 순서는 바인더 순서의 원고 회차(`features/relation-map/lib/episodes.ts`, 폴더 안 포함·카드 제외). `changeAt(relation, orderOf, pointDocId)`가 시점까지의 마지막 변화를 고른다(지워진 회차의 변화는 무시, `sortChanges`는 뒤로). 관계도 툴바 "시점"(최신 / N화까지)은 변화가 하나라도 있을 때만 보인다. 선 아래에 강조 알약으로 표시(`edgeGeometry.changeSlot`). 연표 패널 아래 "관계 변화" 절(`RelationChangesSection`)은 회차 순으로 나열하고 회차를 누르면 그 회차를 연다.
- **e2e** — `relation-map.spec.ts` 2개 추가(색·목록·기억, 변화·시점·표·연표).

### 루프 11 (2026-09-17) — 인물 관계도 후속 4건 (명세 `docs/loops/2026-09-17-relation-map-3.md`)
- **라벨 겹침 회피** — `features/relation-map/lib/labels.ts`: 선마다 라벨 4종(종류·변화·A→B·B→A)의 처음 자리와 법선을 모아 `placeLabels`가 탐욕 배치(제자리 → ±1 → ±2 → ±3칸, 칸 = 높이+4px). 노드 네모는 장애물. 어디도 안 비면 제자리. 알약 크기 어림(`pillSize`)을 캔버스 `Pill`과 한 함수로 공유해 계산과 그림이 어긋나지 않게 했다.
- **종류 색 지정** — `Project.relationTypeColors`(종류 → 라벨 색 이름), `updateRelationTypeColor(type, color|null)`. 폼의 "이 종류의 선 색"은 저장할 때만 반영(고르지 않으면 건드리지 않음). `relationTypeColor(type, overrides)`가 표·캔버스 양쪽의 단일 출처.
- **PNG 내보내기** — `lib/exportPng.ts`: SVG 복제 후 원본의 `getComputedStyle`에서 fill·stroke·글꼴을 속성으로 새기고 `class`를 지운다(그림 안에서는 CSS 변수·Tailwind가 안 먹는다). Blob URL → `Image` → 캔버스 2배 → `toBlob` → `<a download>`. 파일명 `{작품}-관계도-{YYYY-MM-DD}.png`. e2e는 `download` 이벤트의 파일명을 검사한다.
- **연표 사건 시점** — "시점" 선택에 "연표 사건 (연결된 회차 기준)" 묶음. 회차에 연결된 사건만 후보이고 값은 그 회차 id(변화 계산은 그대로 회차 순서).
- **e2e** — `relation-map.spec.ts` 2개 추가(종류 색·저장·PNG, 사건 시점).

### 루프 12 (2026-09-17) — 인물 관계도 후속 4건 (명세 `docs/loops/2026-09-17-relation-map-4.md`)
- **안내선** — `needsLeader(anchor, placed)`: 8px 넘게 밀린 라벨만 처음 자리(선 위)와 라벨 중심을 점선(`2 3`, 투명도 0.7)으로 잇는다. 알약보다 먼저 그려 알약 아래로 들어간다.
- **흑백 PNG** — `svgToPngBlob(svg, scale, { monochrome })`: 캔버스에 그린 뒤 `getImageData`로 픽셀을 BT.601 밝기값으로 바꾸고(`toGrayscale`), 배경은 흰색. 캔버스 `filter` 속성은 Safari 지원이 불확실해 쓰지 않았다. 파일명 `-흑백` 접미. "이미지 저장" 버튼은 `ContextMenu`(컬러 / 흑백)로.
- **노드 폭** — `nodeWidth(name)` = 글자 수 × 14 + 48, 112~240. `toBoxes(layout, nameOf)`가 좌표에 폭·높이를 붙이고, `nodeCenter/canvasSize/hitNode/edgeGeometry/clipToRect`가 `NodeBox`(w·h 선택, 없으면 기본 128×44)를 받는다. 저장 좌표는 왼쪽 위 기준이라 폭이 바뀌어도 그대로. 이름은 13자 넘으면 말줄임.
- **인스펙터 요약** — `CharacterRelationsSummary`(widgets/relation-map): 인물 카드가 열렸을 때 "정보" 탭 아래. 이 인물이 얽힌 관계를 상대 이름순으로 상대·종류(색 점)·(→ 이 인물이 상대에게 / ← 상대가 이 인물에게). "관계도 열기"는 가운데 보기를 관계로 바꾼다. 데이터는 `useRelations`로 직접 읽어 Inspector 위젯은 손대지 않았다.
- **배치·라벨 보강(스크린샷 검수 결과)** — 원형 배치 반지름 최소 140 → 190, 인물당 간격 (128+24) → (128+56). 라벨 후보에 접선 방향(±1·±2칸 × 법선 ±1칸 = 8곳)을 더해 법선 쪽이 다 막혀도 자리를 찾는다(`LabelItem.tangent`, 캔버스가 법선에서 접선을 만든다).
- **e2e** — 1개 추가(노드 폭 112/160, 흑백 파일명, 요약·열기), 기존 PNG 테스트는 메뉴 경유로 수정.

## 3. 주의사항

- **헤더 e2e 계약**: 패널은 `getByRole("button", { name: "패널", exact: true })` → `getByRole("menuitemcheckbox", { name: "<패널명>" })`, 미리보기·내보내기·테마는 `getByRole("button", { name: "더 보기" })` → `getByRole("menuitem", …)`. 인스펙터·집중·본문/카드는 그대로 버튼.

- **Tailwind 눈금**: `h-28`·`h-36`처럼 눈금에 없는 값을 쓰면 클래스가 조용히 무시된다. 새 값을 쓰기 전에 `tailwind.config.ts` spacing을 확인할 것.

- **의존성 추가 후 확인**: 에이전트가 설치한 패키지가 `package.json`에 남았는지 커밋 전에 확인한다. `rm -rf node_modules && npm ci && npx tsc --noEmit`이 CI와 같은 조건이다.

- **버튼 이름 겹침 재발 주의**: "카드"(보기 전환)와 "카드 템플릿"이 부분 일치한다. e2e는 `exact: true`로 찾는다.

- **e2e 버튼 이름 규칙**: Playwright `getByRole(name)`은 부분 일치라 새 버튼 이름에 기존 이름("새 문서" 등)을 포함하면 기존 스펙 27개가 한꺼번에 깨진다(실제로 겪음). 새 버튼은 겹치지 않는 이름으로.
- **폴더 선택**: 이제 폴더 클릭은 접기가 아니라 선택(연속 보기)이다. 접기는 chevron과 ←/→ 키.
- **카드 문서는 원고가 아니다**: `kind`가 character/setting이면 회차 분량표·내보내기에서 빠진다. 코르크보드·검색·백업에는 포함된다.

- **관계도 기하 함수는 상자(`NodeBox`)를 받는다**: 좌표(`Layout`)만 넘기면 기본 폭 128로 계산돼 넓은 노드에서 선이 네모 안으로 들어간다. 캔버스처럼 `toBoxes`로 바꿔 넘길 것.
- **SVG를 그림으로 뽑을 때**: 클래스에 기댄 스타일은 `<img>`로 그리는 순간 사라진다. `exportPng.ts`처럼 계산된 스타일을 속성으로 굳혀야 한다. 새 SVG 요소에 색 클래스를 더하면 `STYLE_PROPS`에 그 속성이 있는지 확인할 것.
- **라벨 색을 쓰는 새 화면은 `withDefaultLabels`부터**: `Project.labels`는 한 번도 안 건드린 작품에서 `undefined`다. `findLabel(labels, id)`에 그대로 넘기면 null이 나와 색이 사라진다(관계도 첫 e2e에서 겪음).
- **개발 서버를 죽일 때 같은 명령줄에 서버 시작 문자열을 넣지 말 것**: `(npx next dev -p 3100 &) … pkill -f "next dev -p 31[0]0"`처럼 한 Bash 호출에 두면 pkill이 자기 셸(명령줄에 "next dev -p 3100"이 있음)을 죽인다(exit 144, 두 번 겪음). 시작과 종료는 별도 호출로.
- **SVG 요소의 role**: Playwright `getByRole`은 `<g role="button" aria-label>`·`<circle role="button">`을 잡는다. 관계도 e2e는 이 이름(`인물 {이름}`, `{이름}에서 관계 잇기`, `관계 A – B: 종류`)에 의존한다.
- **API 키는 어디에도 남기지 않는다**: 백업 JSON·IndexedDB·로그·e2e 스냅샷에 키가 들어가면 안 된다. e2e는 요청 본문에 키가 없음을 검사한다. 키를 다루는 코드는 `shared/ai-client/keyStore.ts` 한 곳뿐이어야 한다.
- **Anthropic SDK 정적 import 금지**: `@anthropic-ai/sdk`는 `shared/ai-client/client.ts`에서만 `import()`로 부른다. 배럴에서 재수출하면 작업실 번들이 커진다(docx와 같은 규칙).
- **패널 번호 = PANEL_KEYS 순서**: 패널을 추가하면 `PANEL_KEYS`, 헤더 `PANEL_MENU`, 단축키 정규식(`[1-8]`), `ShortcutHelp`, e2e `panel-shortcuts.spec`을 함께 바꾼다. 인스펙터는 항상 마지막 번호.

- **F2 키**: 에디터가 window에 F2 리스너를 달아 제목 편집을 연다. 바인더는 자기 F2 처리에서 `stopPropagation`으로 막는다. 에디터 리스너를 capture 단계로 바꾸면 바인더 인라인 편집이 깨진다.
- **docx 패키지는 배럴에서 재수출하지 말 것**: `features/export-document/index.ts`에서 재수출하면 작업실 첫 로드가 +100KB(실측 240→344KB)가 된다. `ExportMenu`가 버튼 클릭 시 `import("../lib/docx")`로 가져온다.

- **집필 기록 단위**: 2026-09-15 이전 기록은 단어 수만 있다. 글자 단위로 볼 때 그 날들은 단어 수가 그대로 보인다(과소 표시). 되돌릴 방법은 없다(본문 이력이 없다).
- **분량 단위는 브라우저 전체 설정**이고 목표(문서·작품·하루·회차) 숫자는 단위를 바꿔도 자동 환산되지 않는다. 입력 칸 옆에 현재 단위를 표시한다.
- **서비스 워커**: 캐시 이름 `VERSION`을 올려야 옛 캐시가 지워진다. 배포 뒤 화면이 옛것으로 보이면 이 값을 의심할 것. 처음 여는 작업실 주소는 오프라인에서 열리지 않는다(대시보드로 대체).
- **e2e 환경**: 이 컨테이너는 Playwright가 기대하는 Chromium 리비전이 없어 `pw.local.config.ts`(로컬 전용, git 제외)로 사전 설치 Chromium을 지정해 돌렸다. CI는 `playwright install`로 정식 경로를 쓴다.
- **플랫폼 분량 기준**은 바뀐다. `EPISODE_PRESETS`의 `source`를 갱신하면서 값을 고칠 것.
