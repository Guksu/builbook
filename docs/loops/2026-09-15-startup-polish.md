# 루프: 스타트업 제품 완성도 루프

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-09-15 |
| 작성 | Claude |
| 상태 | 성공 종료 |
| 실행 단위 | 세션 내 단계 반복 + 검증자 게이트(Stop 훅) |

## 1. 목표

4단계(기반 다지기 → 온디바이스 AI 제거 → 집필 경험 → 배포·유통)가 전부 구현되고, 각 단계 종료 시 `npm run lint` + `npx tsc --noEmit` + `npm test` + `npm run build` + `npx playwright test` 전체 통과. 각 단계는 통과 즉시 main에 푸시한다(사용자 결정 2026-09-15: PR 없이 main 직행).

## 2. 루프 설계 — 사용자 확인: 2026-09-15 확인됨

| 요소 | 값 |
|------|-----|
| 트리거 | 사용자 요청 1회 ("실제 스타트업 제품처럼 개선, 최종까지 루프로 진행") |
| 실행 단위 | 단계 1개 = 1반복. 구현 → 검증 → 커밋·main 푸시 → 실행 기록 갱신 |
| 검증자 | 기계적 검증만: lint · tsc · vitest · next build · playwright. 에이전트 자기평가 금지 |
| 종료 규칙 | 성공: 4단계 전부 완료 + 검증 전체 통과. 실패: 아래 안전장치 도달 시 자동 중단·보고 |

## 3. 안전장치

| 장치 | 값 |
|------|-----|
| 최대 반복 | 10회 (verifierGate.config.json maxIterations) |
| 토큰 예산 | 2,000,000 토큰 (verifierGate.config.json maxTokens) — 초과 시 중단·보고 |
| 막힘 판정 | 같은 실패 시그니처 3연속 (verifierGate.config.json stuckAfter: 3) |

## 4. 실행 기록

| 반복 | 결과 | 비고 |
|------|------|------|
| 4 | 통과 — 4단계 배포·유통: PWA(manifest·서비스워커·아이콘), 검색 메타(OG·robots·sitemap), 랜딩 개편, DOCX 내보내기(동적 import), 반응형(바인더 드로어·패널 오버레이) | lint 0 · tsc 0 · unit 263 · build OK · e2e 48/48 |
| 3 | 통과 — 3단계 집필 경험: 분량 단위 통일(글자 수 기본, `features/count-unit`), 회차 분량 프리셋(근거 명시), 첫 작품 "1화" 자동 생성·"N화" 자동 번호·마지막 문서 복원, 옵시디언식 바인더(즉시 생성·인라인 이름 편집·우클릭 메뉴·접기·정렬·키보드, `features/binder-tree`), 에디터 도구(placeholder·최소 툴바·단축키 안내·찾기/바꾸기 `features/find-replace`·제목 인라인 수정), `--space-*` 토큰 미정의 버그 수정, PromptModal 제거 | lint 0 · tsc 0 · unit 263 · build OK(작업실 첫 로드 240kB) · e2e 46/46 |
| 2 | 통과 — 2단계 AI 제거: `src/shared/ai`·`features/ai-chat`·`widgets/ai-assistant` 삭제, `@huggingface/transformers` 제거(패키지 34개 감소), 헤더 "AI 문답" 칩 제거, CLAUDE.md·오케스트레이터·AI 에이전트/스킬·`_workspace/08` 휴면 표기 | lint 0 · tsc 0 · unit 211 · build OK · e2e 34/34 |
| 1 | 통과 — 1단계 기반: GitHub Actions CI(lint·tsc·unit·build·e2e), e2e 실패 2건 수정(헤더 "N단어" 중복 locator, 한글 다운로드 파일명은 UTF-8 로케일 부재가 원인 → playwright.config에서 LANG 기본값), app/error.tsx·not-found.tsx, features/storage-guard(navigator.storage.persist + 사용량 안내), features/tab-guard(BroadcastChannel로 같은 문서 다중 탭 경고) | lint 0 · tsc 0 · unit 211 · build OK · e2e 34/34 |
| 0 | 베이스라인 — lint 0 · tsc 0 · unit 199 · build OK · e2e 32/34 (실패 2: 테스트 drift 1, 내보내기 파일명 1) · `npm ci` 실패(lock 불일치) → lock 동기화 커밋 | 사용자 결정: AI는 제거(A), 컨셉 유지, 사이드바는 옵시디언 참고, 글자 수 기준 통일 |

## 5. 종료 보고

**성공 종료 (2026-09-15).** 4단계 전부 구현·검증 완료, 각 단계 main 푸시. 안전장치 미발동(반복 4/10, 막힘 0).

- 최종 검증: `npm run lint`(0) · `npx tsc --noEmit`(0) · `npm test`(263) · `npm run build`(성공, 작업실 첫 로드 240KB) · `npx playwright test`(48/48).
- 남은 실패: 없음.
- 확인하지 못한 것: 회차 분량 프리셋의 플랫폼 수치는 공식 페이지를 이 환경에서 열 수 없어 검색 요약에 의존했다(코드 `EPISODE_PRESETS.source`에 그렇게 적어 둠). 문피아는 자료가 엇갈려 넣지 않았다.
- 후속 제안: (1) 사용자 API 키 기반 클라우드 AI(서버 없음 유지) 재검토, (2) 정렬 기준 영속화, (3) 드래그 재정렬 e2e, (4) 배포 시 `NEXT_PUBLIC_SITE_URL` 설정과 서비스워커 `VERSION` 운영 규칙.
- 상세 기록: `docs/worklogs/2026-09-15-startup-polish.md`.
