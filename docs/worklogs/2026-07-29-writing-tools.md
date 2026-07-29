# 집필 도구 4종 세트 (백업·연재·구조·일관성)

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-07-29 |
| 작성 | Claude (webnovel-editor-orchestrator) |
| 관련 경로 | `src/shared/{db,lib}`, `src/entities/{writing-log,story-event,term,document,project}`, `src/features/{backup-restore,writing-stats,reader-preview,corkboard,consistency-check}`, `src/widgets/{stats-panel,corkboard,timeline-panel,consistency-panel}`, `src/views/{workspace,dashboard}`, `e2e` |

## 1. 개요

본격적인 장편 집필에 들어가기 전, 에디터에 빠져 있던 집필 실무 도구를 채웠다. 사용자가 고른 네 묶음(데이터 안전 / 연재 실전 / 구조 설계 / 설정 일관성)을 모두 구현했다. 백엔드가 없는 local-first 구조는 그대로 유지했고, 새 도메인은 IndexedDB 스토어 3개(writingLogs·events·terms) 추가와 기존 레코드의 선택 필드 추가만으로 수용했다(기존 데이터 마이그레이션 없음). 분석·판정 로직은 전부 순수 함수로 분리해 vitest로 덮었다(199 테스트).

## 2. 작업내용

### 공통 기반
- `src/shared/lib/text.ts`(신규) — `extractPlainText`·`countWords`·`countChars`·`countCharsWithSpaces`(신규, 공백 포함 = 연재 플랫폼 분량 기준). 기존에 `@features/snapshot-document`에 있던 텍스트 유틸을 shared로 내렸다. 새 기능 5곳이 이 함수들을 쓰는데 feature→feature 수평 import가 늘어나는 걸 막기 위함(2026-07-20 QA가 남긴 후속 과제 해소). 소비처(export·search·editor·snapshot-panel) 임포트 경로 전환, 테스트도 `shared/lib/text.test.ts`로 이관.
- `src/shared/db/index.ts` — `DB_VERSION` 3→6, 스토어 `writingLogs`(v4)·`events`(v5)·`terms`(v6) 추가(모두 `by-project` 인덱스). `dbReplaceAll`(신규) — 비우기+채우기를 한 트랜잭션에 묶은 전체 교체(백업 복원 전용). `DB_VERSION`을 export해 백업 파일에 기록.
- `src/entities/project/api/useProjects.ts` — 작품 삭제 cascade에 `deleteWritingLogsForProject`·`deleteStoryEventsForProject`·`deleteTermsForProject` 연결(고아 레코드 방지 — 반복1·2의 교훈을 새 스토어 3종에 선제 적용).

### ① 데이터 안전 (features/backup-restore)
- `lib/backup.ts`(순수) — 백업 파일 형식(`builbook-backup` v1: format/version/exportedAt/dbVersion/counts/data), `parseBackup`(다른 앱 파일·미래 버전·id 없는 손상 레코드 거부, 빠진 스토어는 빈 배열 허용), `mergeById`(같은 id면 `updatedAt` 최신 우선 — **오래된 백업이 최신 원고를 덮지 않는다**), `dropOrphans`, `planImport`(merge/replace), `backupStatus`(배너 판정: 작품 0개면 침묵, 미백업/7일 경과면 경고).
- `lib/backupFile.ts` — Blob 다운로드 / FileReader 읽기(DOM 부수효과 분리).
- `model/useBackup.ts` — 전 스토어 읽기 → 파일 저장, 복원 시 `dbReplaceAll` × 7 + SWR 전역 `mutate(() => true)`로 열린 화면 전부 재검증. 마지막 백업 시각은 localStorage에 두되 **SWR 캐시 키로 공유**(배너·모달이 각각 훅을 부르므로 useState면 배너가 옛 상태로 남는다 — e2e에서 실제로 잡혔다).
- `ui/BackupModal.tsx`(내보내기 + 파일 선택→내용 확인→복원 3단계, replace는 동의 체크박스 필수), `ui/BackupReminder.tsx`(대시보드 배너), 대시보드 헤더에 "백업" 버튼 연결.
- 백업 범위는 스토어 추가 때마다 함께 확장했다: projects·documents·snapshots·notes·**writingLogs·events·terms**.

### ② 연재 실전
- `src/entities/writing-log`(신규) — 작품×날짜 1레코드(`net`/`written`). `lib/stats.ts`(순수): 로컬 기준 `dateKey`, `applyDelta`, `computeStreak`(오늘 안 썼어도 어제까지 연속 유지), `longestStreak`, `buildSeries`, `averagePerActiveDay`, `bestDay`, `estimateDaysToGoal`.
- 기록 입력점은 한 곳: `saveDocumentContent`가 저장 직전 `wordCount` 차이를 계산해 `recordWriting` 호출(실패해도 원고 저장에 영향 없도록 try/catch). `useAutosave`가 저장 후 `writingLogsKey`도 무효화.
- `src/features/writing-stats/lib/episodes.ts`(순수) — 회차 분량표(공백 포함 글자 수, 목표 대비 90%/120% 기준으로 짧음·적정·긴 편), 요약(편수·평균·상태별 개수). 기본 목표 5,500자.
- `src/widgets/stats-panel` — 오늘 분량+하루 목표 진행률, 연속/최장 집필일, 최근 14일 막대, 누적·평균·최고의 날·완성 예상일, 회차 분량 목록(클릭 시 해당 회차 열기).
- `src/features/reader-preview` — 독자 뷰 모달(좁은 단·넓은 행간·글자 크기 3단계), `readerStats`(문단 수·분량·예상 읽기 시간 600자/분·대사 비율).
- `Project`에 `dailyGoal?`·`episodeGoal?` 추가, `useProject`의 목표 갱신 3종을 한 함수로 통합.

### ③ 구조 설계
- `src/features/corkboard/lib/cards.ts`(순수) — 바인더 순서 그대로 카드 변환(폴더 포함, 휴지통 제외), 진행 상태 순환(초고→퇴고→완료), 요약.
- `src/widgets/corkboard` — 카드 그리드, 시놉시스 인라인 편집, 상태 칩, 드래그 재정렬(바인더와 같은 `planReorder` 규약: 폴더=into, 문서=before). `DocumentNode.status?` 선택 필드 + `updateStatus` 추가.
- `src/entities/story-event`(신규) + `src/widgets/timeline-panel` — 연표(사건 이름·작중 시점·설명·연결 회차). `lib/timeline.ts`(순수): 정렬, 위/아래 이동(order 0..n-1 재인덱싱), `buildTimelineRows`(삭제된 회차를 가리키면 **끊어진 연결**로 표시 — 조용히 감추지 않는다).
- 워크스페이스 가운데 영역에 보기 모드 도입: 본문(에디터) ↔ 카드(코르크보드). 카드 제목을 누르면 본문으로 전환.

### ④ 설정 일관성
- `src/entities/term`(신규) — 고유명사 사전(정본 표기·분류 인물/지명/용어·허용 이명·메모). 정본은 2글자 이상만 허용(1글자는 검사 소음).
- `src/features/consistency-check/lib/variants.ts`(순수) — 토큰화, 편집 거리(한도 초과 시 조기 종료), **판정 순서가 핵심**: ① 어느 용어든 정본·이명으로 제대로 쓰였으면 사용 횟수만 올리고 종료 → ② 남은 토큰만 정본과 유사도 비교. 한국어 조사를 감안해 토큰 앞부분(정본 길이만큼)으로 비교하고, 흔들린 표기는 조사를 뗀 형태로 묶어 집계한다.
- `src/features/consistency-check/lib/sentences.ts`(순수) — 문장 분리, 평균/최장/긴 문장(60자 초과) 개수, 대사 비율, 어미 3연속 반복 구간, 자주 쓴 말.
- `src/widgets/consistency-panel` — 탭 3개(사전 / 표기 검사 / 문장 진단). 검사는 해당 탭을 열었을 때만 `useMemo`로 실행.

### 테스트
- 단위(vitest) 199개: backup(24)·text(17)·writing-log stats(21)·episodes(11)·readerText(11)·cards(10)·timeline(13)·variants(17)·sentences(17) 등. 경계(빈 입력·손상 파일·0건·중복·조사)를 함께 덮었다.
- e2e(Playwright) 34개(신규 15): `backup.spec.ts`(배너·왕복 복원·남의 파일 거부), `serial-tools.spec.ts`(집필량 기록·회차표·하루 목표·독자 뷰), `structure-tools.spec.ts`(시놉시스·상태 칩·카드→본문·연표 CRUD/순서), `consistency-tools.spec.ts`(사전 영속·흔들림 검출·이명 예외·문장 진단).

## 3. 주의사항

- **브랜치·커밋**: 커밋은 사용자 전담(훅 차단)이라 세트별 브랜치를 나눠도 변경이 워킹트리에 그대로 따라온다. 그래서 전부 `feat/writing-tools` 한 브랜치에 쌓았다(`feat/backup-restore`·`feat/serial-tools`는 중간에 만든 빈 포인터라 필요 없으면 지워도 된다). 세트별로 나눠 커밋하려면 위 §2의 묶음별 파일 목록을 그대로 쓰면 된다.
- **DB 버전 6**: 이 브랜치를 되돌리면 이미 v6로 올라간 브라우저는 `VersionError`로 앱이 열리지 않는다(IndexedDB는 다운그레이드 불가). 되돌릴 일이 생기면 백업 파일을 먼저 내보내고, 브라우저 저장소를 지운 뒤 복원해야 한다.
- **백업 파일 형식은 이제 계약이다**: 스토어를 새로 추가하면 `BackupData`·`BACKUP_STORES`·`readAllData`·`importBackup`의 `dbReplaceAll` 목록 네 곳을 함께 늘려야 한다. 하나라도 빠지면 그 데이터는 조용히 백업에서 빠진다.
- **표기 검사는 제안이지 교정이 아니다**: 편집 거리 기반이라 비슷한 다른 고유명사(테아르/테아론)를 오탐할 수 있어, 다른 용어의 정본으로 쓰인 토큰은 검사에서 빼는 방어를 넣었다. 그래도 애매하면 사전의 '허용 표기'에 등록하는 게 정답이다. 형태소 분석기 없이 도는 어림이라 정밀도보다 신호를 택했다.
- **집필 기록은 저장 델타 기준**: 자동저장이 도는 시점에만 쌓이므로, 다른 기기/브라우저에서 쓴 분량은 합쳐지지 않는다(백업 병합으로만 합쳐진다). 문서를 지웠다 되살리면 그날 `net`이 음수로 갈 수 있고, `written`(양의 변화만)이 연속 집필일 판정 기준이다.
- **독자 뷰는 저장된 content를 본다**: 타이핑 직후(자동저장 debounce 800ms 이내) 미리보기를 열면 마지막 저장 시점 기준으로 보인다.
- **e2e 타임아웃**: 앱이 커지면서 dev 서버 초기 컴파일 중 병렬 워커가 몰리면 하이드레이션 전 클릭으로 오탐이 났다. `playwright.config.ts`의 `expect.timeout`을 10초로 올리고, 새 스펙 헬퍼는 빈 상태가 보일 때까지 기다린 뒤 클릭한다.
