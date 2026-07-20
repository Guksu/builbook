# 집중 모드 + 글자수·목표 카운터

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-07-20 |
| 작성 | focus-builder (editor-engineer) |
| 관련 경로 | `src/features/writing-goals/**`, `src/shared/ui/ProgressBar.tsx`, `src/views/workspace/ui/WorkspacePage.tsx`, `src/widgets/editor/ui/Editor.tsx`, `src/widgets/inspector/ui/Inspector.tsx`, `src/entities/{document,project}/**`, `e2e/focus-goals.spec.ts` |

## 1. 개요

스크리브너의 Composition Mode + Project Targets를 진입장벽 낮게 단순화한 두 기능을 구현했다.
(1) **집중 모드**: 바인더·인스펙터·헤더 등 주변 UI를 숨기고 본문에만 몰입, 한 번 클릭으로 켜고 ESC/버튼으로 해제.
(2) **글자수·목표 카운터**: 문서·작품 단위 목표(선택)를 설정하면 진행률(현재/목표, %)을 진행률 바로 표시.
집필 흐름을 끊지 않도록 집중 모드 중에도 은은한 단어 수/진행률을 하단에 띄운다.

## 2. 작업내용

- `src/features/writing-goals/lib/progress.ts` (신규): `computeProgress(current, goal)`·`sumWordCounts(docs)` 순수 함수. 목표 미설정/0/음수·초과 달성·비수치 방어를 모두 처리. **단어를 새로 세지 않고 이미 계산된 `wordCount`만 소비**한다(경계면 규약 준수).
- `src/features/writing-goals/lib/progress.test.ts` (신규): 경계 케이스 단위 테스트(목표 undefined·0·음수, 정확·초과 달성, 반올림, 현재 0, 폴더 제외 등).
- `src/shared/ui/ProgressBar.tsx` (신규): 토큰 기반 진행률 바(트랙 surface/border, 채움 primary→달성 시 success). `role="progressbar"`. barrel 등록.
- `src/features/writing-goals/ui/GoalMeter.tsx` (신규): 현재/목표 수치 + 진행률 바 + 목표 편집 input(빈 값→미설정) 한 칸. 문서·작품 양쪽에 재사용.
- `src/widgets/editor/ui/Editor.tsx`: 로컬 `countWords` 중복 제거 → `@features/snapshot-document`의 순수 함수 재사용(규칙 단일 출처화). `onWordCountChange?` prop 추가로 실시간 단어 수를 상위에 올림. **Tiptap 인스턴스는 그대로**(prop 추가만).
- `src/widgets/inspector/ui/Inspector.tsx`: 정보 탭에 작품 전체 GoalMeter + 문서 GoalMeter + 기존 시놉시스. 문서 GoalMeter는 `key=doc.id`로 전환 시 입력 리셋.
- `src/entities/document`: `DocumentNode.goal?: number` 필드 + `updateGoal(id, goal)` (스토어 추가 없이 레코드 필드만 확장 → 마이그레이션 불필요).
- `src/entities/project`: `Project.goal?: number` 필드 + 단일 작품 훅 `useProject(projectId)`(`project`, `updateGoal`) + `projectKey` export.
- `src/views/workspace/ui/WorkspacePage.tsx`: `focusMode`·`liveWords` 상태, ESC 리스너, `projectTotalWords`(현재 편집 문서만 실시간 값으로 치환), 헤더/바인더 `hidden` 토글, 우측 패널 `!focusMode` 게이팅, 집중 모드 플로팅 카운터(단어 수+진행률+나가기). Inspector에 카운터 props 연결.
- `e2e/focus-goals.spec.ts` (신규): (a) 집중 토글 시 바인더 숨김→ESC 복귀 + 에디터 내용 유지, (b) 문서 목표 설정 시 진행률 바 등장.

## 3. 주의사항

- **단어/글자수 규칙 단일 출처**: 세는 규칙은 `src/features/snapshot-document/lib/snapshotText.ts`의 `countWords`가 유일한 출처다. 이번에 Editor의 중복 로컬 함수를 제거하고 이 함수를 재사용하도록 통일했다. 목표·집중모드는 세지 않고 `wordCount` 값만 계산에 쓴다. 새 카운팅 규칙을 만들지 말 것.
- **Tiptap 인스턴스 보존**: 집중 모드는 레이아웃만 바꾼다. 헤더·바인더는 트리에서 제거하지 않고 `hidden`(display:none)으로만 숨겨 `<main>`의 형제 위치를 고정 → 에디터 재마운트/커서·입력 손실 없음. 우측 패널은 원래 조건부 렌더라 main 뒤에 있어 위치에 영향 없음. Editor의 `key`(`selected.id:reloadToken`)는 그대로 두었다 — 집중 토글이 key를 바꾸지 않음.
- **필드 추가 마이그레이션 불필요**: `goal`은 기존 스토어(documents/projects) 레코드에 선택 필드로 추가. 기존 레코드는 `goal` undefined → `computeProgress`가 "목표 미설정"으로 처리. DB 버전은 v3 그대로.
- **작품 합계 실시간성**: `projectTotalWords`는 저장된 `wordCount` 합에서 현재 편집 중 문서만 `liveWords`로 치환한다(자동저장 flush 전에도 즉시 반영). 다른 문서는 자동저장→SWR mutate 시 갱신.
- 목표 저장 콜백은 빈 입력이면 `null`을 넘겨 `goal: undefined`로 저장(해제). 0 입력도 진행률 계산에서 미설정으로 취급.
- 검증: `npm run lint`·`npx vitest run`(55 통과)·`npm run build`·`npx playwright test`(16 통과, 기존 회귀 없음) 모두 exit 0.
