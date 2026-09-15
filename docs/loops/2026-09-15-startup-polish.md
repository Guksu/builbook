# 루프: 스타트업 제품 완성도 루프

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-09-15 |
| 작성 | Claude |
| 상태 | 실행 중 |
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
| 1 | 통과 — 1단계 기반: GitHub Actions CI(lint·tsc·unit·build·e2e), e2e 실패 2건 수정(헤더 "N단어" 중복 locator, 한글 다운로드 파일명은 UTF-8 로케일 부재가 원인 → playwright.config에서 LANG 기본값), app/error.tsx·not-found.tsx, features/storage-guard(navigator.storage.persist + 사용량 안내), features/tab-guard(BroadcastChannel로 같은 문서 다중 탭 경고) | lint 0 · tsc 0 · unit 211 · build OK · e2e 34/34 |
| 0 | 베이스라인 — lint 0 · tsc 0 · unit 199 · build OK · e2e 32/34 (실패 2: 테스트 drift 1, 내보내기 파일명 1) · `npm ci` 실패(lock 불일치) → lock 동기화 커밋 | 사용자 결정: AI는 제거(A), 컨셉 유지, 사이드바는 옵시디언 참고, 글자 수 기준 통일 |

## 5. 종료 보고

(진행 중)
