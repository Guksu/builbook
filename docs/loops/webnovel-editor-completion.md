# 루프: 웹소설 에디터 완성 루프

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-07-20 |
| 작성 | Claude (guksu-harness loop 스킬) |
| 상태 | 성공 종료 |
| 실행 수단 | 세션 내 반복(오케스트레이터 순차 실행) + 검증자 게이트(Stop 훅) |

## 1. 목표

완성 백로그 4묶음이 전부 구현되고, `npm run lint` + `npm test`(vitest, 1반복에서 신설) + `npm run build` 전체 통과. 각 기능은 해당 Playwright e2e 스펙 추가 후 `npm run test:e2e` 통과.

**완성 백로그 (2026-07-20 사용자 선택):**

| # | 기능 | 상태 |
|---|------|------|
| 0 | vitest 단위 테스트 기반 구축 + 기존 순수 로직(planReorder 등) 커버 (TDD 절대 규칙 2 선행 조건) | 대기 |
| 1 | 스냅샷(문서 버전 히스토리) — 저장·목록·비교·복원, IndexedDB snapshots 스토어 | 대기 |
| 2 | 캐릭터·설정 노트 — 작품별 리서치 영역 | 대기 |
| 3 | 집중 모드 + 글자수·목표 카운터 | 대기 |
| 4 | 검색·내보내기(txt/md)·휴지통 복원 | 대기 |

## 2. 루프 설계 — 사용자 확인: 2026-07-20 확인됨

| 요소 | 값 |
|------|-----|
| 트리거 | 사용자 요청 1회 ("완벽한 웹소설 에디터로 완성, 루프로 진행") |
| 실행 단위 | 백로그 항목 1개 = 1반복. `webnovel-editor-orchestrator` 흐름으로 구현(TDD: 인수조건=테스트 선행) → 검증 → 백로그 체크오프 → 실행 기록 갱신 |
| 검증자 | 기계적 검증만: `npm run lint` + `npm test` + `npm run build` (검증자 게이트가 턴 종료 시 강제). 기능별 e2e는 반복 내에서 `npm run test:e2e`로 실행. 생성자(구현 에이전트)와 검증(명령 종료 코드 + qa-inspector 경계면 교차검증) 분리 |
| 종료 규칙 | 성공: 백로그 전체 완료 + 검증 명령 전체 통과. 실패: 아래 안전장치 도달 시 자동 중단·보고 |

## 3. 안전장치

| 장치 | 값 |
|------|-----|
| 최대 반복 | 10회 |
| 토큰 예산 | 2,000,000 토큰 (2026-07-20 사용자 확인) — 초과 시 루프를 계속하지 않고 자동 중단, 진행 상황·남은 실패·사유를 보고 후 종료 |
| 막힘 판정 | 같은 실패 시그니처 3연속 — verifierGate.config.json `stuckAfter: 3`으로 기계적 강제 |

## 4. 실행 기록

| 반복 | 결과 | 비고 |
|------|------|------|
| 0 | 통과 — vitest 신설(planReorder 12 테스트), `npm test` 스크립트 추가, `.eslintrc.json` 생성(next lint 대화형 프롬프트 제거), e2e 4건 수리(prompt()→PromptModal drift) | lint·unit·build·e2e(9/9) 전부 green. 베이스라인 e2e 실패 4건은 기존 결함(커밋 3388d03 이후 테스트 미갱신)이었음 |
| 1 | 통과 — 스냅샷(entities/snapshot, features/snapshot-document, widgets/snapshot-panel), DB v2 snapshots 스토어, 저장·미리보기·복원·복원전자동스냅샷. **QA 교차검증에서 경계면 버그 1건 적발·수정**: 문서/작품 삭제 시 스냅샷 고아 누적 → `deleteSnapshotsForDocuments`로 두 cascade 경로 연결 + e2e 회귀 테스트 추가 | lint·unit(31)·build·e2e(11/11) green. snapshotText 순수 로직 단위 테스트 포함 |
| 2 | 통과 — 캐릭터·설정 노트(entities/note, features/note-research, widgets/notes-panel), DB v3 notes 스토어(contains 가드), 카테고리별 목록·추가·편집·삭제, 워크스페이스 '리서치' 패널 토글. deleteProject에 `deleteNotesForProject` cascade 연결(반복1 교훈을 빌더가 선제 반영 — 노트 고아 방지 e2e 포함) | lint·unit(42)·build·e2e(14/14) green. WorkspacePage 통합 확인(NotesPanel 마운트) |
| 3 | 통과 — 집중 모드(헤더·바인더 display:none, Tiptap 재마운트 없이 커서 보존, ESC 해제) + 글자수·목표 카운터(features/writing-goals, ui/ProgressBar). DocumentNode.goal?·Project.goal? 선택 필드만 추가(스토어 변경 없음). **경계면 개선**: Editor의 중복 countWords 제거 → snapshotText.countWords 단일 출처로 통일 | lint·unit(55, progress 경계 케이스)·build·e2e(16/16) green. countWords 단일 출처 재확인 |
| 4 | 통과 — 검색(features/search-document)·내보내기 txt/md(features/export-document)·휴지통 소프트삭제(features/trash-document, DocumentNode.trashedAt?). 삭제 의미를 소프트삭제로 변경, `selectActiveDocuments` 단일 필터로 바인더·검색·내보내기·글자수합계 모든 소비처가 휴지통 제외. 하드삭제+스냅샷정리는 permanentlyDeleteDocument로 이동. **최종 QA 교차검증에서 FSD 위반 1건 적발·수정**: entities/note→features/note-research 역참조+순환 → 순수 lib를 entities/note/lib로 이관, feature 삭제 | lint·unit(79)·build·e2e(19/19) green |

## 5. 종료 보고

**성공 종료 (2026-07-20).** 백로그 5항목(반복 0~4) 전부 구현·검증 완료. 안전장치 미발동(토큰 예산 2M 내, 최대 10반복 중 5반복 사용, 막힘 0).

- **최종 검증**: `npm run lint`(0) · `npm test`(vitest 79) · `npm run build`(성공) · `npx playwright test`(19/19) 전부 green.
- **QA가 잡은 경계면 버그 2건(테스트 통과에도 숨어있던 것)**: (1) 반복1 스냅샷 고아 누적(문서/작품 삭제 시 스냅샷 미정리) → cascade 연결 + 회귀 테스트. (2) 반복4 후 최종 QA에서 entities→features 역참조+순환 → 레이어 이관. 둘 다 수정 완료.
- **미해결 없음.** 마이너 설계 스멜(feature→feature 수평 import: search/export가 snapshot-document의 extractPlainText 재사용)은 런타임 무해로 남겨둠 — 향후 shared/entities로 내릴 후보.
- **커밋은 사용자 전담** — feat/editor-completion-loop 브랜치에 변경만 쌓여 있음.

## 5. 종료 보고

(진행 중)
