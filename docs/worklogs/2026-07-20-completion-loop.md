# 웹소설 에디터 완성 루프 (반복 0~4)

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-07-20 |
| 작성 | Claude (webnovel-editor-orchestrator + loop) |
| 관련 경로 | src/entities/{snapshot,note}, src/features/{snapshot-document,note-research→note/lib,writing-goals,search-document,export-document,trash-document}, src/widgets/{snapshot-panel,notes-panel}, src/views/workspace, docs/loops/webnovel-editor-completion.md |

## 1. 개요

"완벽한 웹소설 에디터로 완성, 루프로 진행" 요청에 따라, 기존 MVP-1(문서트리·에디터·자동저장·AI문답)이 완결된 상태 위에 스크리브너의 본질 기능 5묶음을 루프로 반복 구현했다. loop 스킬로 4요소·안전장치(토큰 2M·최대 10반복·막힘 3연속)를 사용자 확인 후, 매 반복을 TDD + 기계적 검증(lint·vitest·build·e2e) 게이트로 닫았다.

## 2. 작업내용

- **반복 0 — 테스트 기반**: vitest 도입(`npm test`=vitest run), `vitest.config.ts` 별칭을 tsconfig와 1:1 정렬, planReorder 순수 로직 12 테스트. `.eslintrc.json` 생성(next lint 대화형 프롬프트 제거). prompt()→PromptModal drift로 깨져있던 기존 e2e 4건 수리.
- **반복 1 — 스냅샷**: `entities/snapshot`·`features/snapshot-document`·`widgets/snapshot-panel`, DB v2 snapshots 스토어(contains 가드). 저장·미리보기·복원·복원전 자동스냅샷. QA에서 문서/작품 삭제 시 스냅샷 고아 누적 적발 → `deleteSnapshotsForDocuments`로 두 cascade 경로 연결 + e2e 회귀.
- **반복 2 — 캐릭터·설정 노트**: `entities/note`·`widgets/notes-panel`, DB v3 notes 스토어. 카테고리별 CRUD, 워크스페이스 '리서치' 패널. deleteProject에 노트 cascade 연결.
- **반복 3 — 집중 모드 + 목표**: 헤더·바인더 display:none으로 몰입(Tiptap 재마운트 없이 커서 보존, ESC 해제), `features/writing-goals`·`ui/ProgressBar`. DocumentNode.goal?·Project.goal? 선택 필드. Editor 중복 countWords 제거 → snapshotText.countWords 단일 출처.
- **반복 4 — 검색·내보내기·휴지통**: `features/search-document`·`export-document`(txt/md Blob 다운로드)·`trash-document`(소프트삭제 trashedAt). `selectActiveDocuments` 단일 필터로 전 소비처 휴지통 제외, 하드삭제+스냅샷정리는 permanentlyDeleteDocument로 이동.
- **최종 QA 수정**: entities/note→features/note-research 역참조+type-only 순환을 순수 lib의 entities/note/lib 이관으로 해소(feature 삭제).
- **가드레일**: 훅 4종(git·시크릿·branchGuard·verifierGate) + settings.json deny/allow, 공통 템플릿 6종 배포, 루프 명세 기록.

## 3. 주의사항

- **커밋은 사용자 전담.** feat/editor-completion-loop 브랜치에 변경만 쌓여 있다(git 훅이 에이전트 커밋 차단).
- **AI 문답 e2e는 여전히 없음** — 모델 다운로드(919MB)가 CI 부적합해 의도적 제외. 온디바이스 추론 품질은 런타임 검증 영역.
- **feature→feature 수평 import 잔존**: search/export가 snapshot-document의 extractPlainText 재사용. 런타임 무해하나 엄격 FSD에선 shared/entities로 내릴 후보(설계 스멜, 미해결로 남김).
- **DB는 v3.** 스냅샷·노트 스토어 추가 시 contains 가드로 기존 데이터 보존. 목표·휴지통은 레코드 필드 추가만(마이그레이션 불필요, 기존 레코드는 undefined=정상 처리).
- 검증자 게이트(Stop 훅)가 lint·unit·build를 매 턴 종료 시 강제하므로, 이후 이 브랜치에서 작업하면 해당 3종을 통과해야 턴이 닫힌다.
