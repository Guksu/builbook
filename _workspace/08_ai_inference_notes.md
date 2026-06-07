# 08 — 온디바이스 AI 문답 구현 노트

## 결정 요약
- **아키텍처:** C(하이브리드) — 브라우저 Transformers.js + Web Worker, 토큰은 postMessage 스트리밍. **SSE 아님**(백엔드/네트워크 구간 없음). assignment(회사 코드)는 엣지케이스·이벤트 계약 *개념*만 차용, 구조 미복제.
- **모델:** `onnx-community/Llama-3.2-1B-Instruct`, dtype `q4`, device 런타임 결정(WebGPU→WASM 폴백). 한국어 품질 우선.
- **배치:** 작업실 우측 패널, 인스펙터처럼 토글(`AI 문답` 버튼).
- **게이팅:** "기능 사용" 클릭 시에만 모델 다운로드/로드.

## 메시지 계약 (SSOT: `src/shared/ai/messages.ts`)
- 메인→worker: `load` / `generate{id,messages}` / `abort`
- worker→메인: `progress{loaded,total,percent}` / `ready` / `token{id,delta}` / `done{id,text}` / `error{message,id?}` / `aborted{id}`
- worker.ts와 engine.ts가 **둘 다 import**(리터럴 중복 금지). QA에서 1:1 일치 확인.

## 상태 머신 (`useAiChat`)
`idle → downloading → ready → generating → ready`, 어디서든 `error`(로드 실패만). 생성 중 에러는 부분 텍스트 보존 후 `ready` 복귀.

## 엣지케이스 처리
| 케이스 | 처리 |
|--------|------|
| 중복 다운로드 | 메인 `enable()` downloading 가드 + worker `generator`/`loadingPromise` 재진입 가드 |
| 취소 잔여 토큰 | `activeIdRef` 불일치 토큰 드롭 + `stop()` 낙관적 종료 |
| 빈 응답 | `finalize`에서 빈 content 메시지 미생성 |
| 생성 중 에러 | 부분 텍스트 보존 + 에러 표시 + 입력 재활성화 |
| WebGPU 미지원 | worker `detectDevice()` WASM 폴백 |
| 패널 토글 시 모델 유실 | `useAiChat`를 view 레벨에 둬 위젯만 언/마운트 |
| 자동 스크롤 | 하단 추종, 사용자 위로 스크롤 시 해제 |
| 컨텍스트 폭주 | 최근 `MAX_HISTORY_TURNS`(8)턴만 + system |

## 파일
- `src/shared/ai/{messages,models,worker,engine,index}.ts`
- `src/features/ai-chat/{model/types.ts,model/useAiChat.ts,index.ts}`
- `src/widgets/ai-assistant/{ui/AiAssistant.tsx,index.ts}`
- `src/views/workspace/ui/WorkspacePage.tsx`(통합)
- `package.json`(+`@huggingface/transformers` v4.2.0)

## 검증
- `npx tsc --noEmit` → 0건. `npm run build` → 성공(워커/transformers 별도 청크, 첫 로드 JS 비대화 없음).
- qa-inspector 경계면 교차검증 → 6/6 PASS, FAIL 0.

## 런타임 미검증(범위 밖) / 후속 확인 권장
- 실제 모델 다운로드·추론·한국어 응답 품질(브라우저에서 `npm run dev` 후 "기능 사용" 클릭하여 확인).
- `.onnx/.wasm` 자산 로딩은 기본 설정으로 빌드 통과 — dev 런타임에서 최종 확인 권장. 문제 시 `client-ai-inference/references/edge-cases.md` §7 참조.
