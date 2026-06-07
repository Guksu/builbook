---
name: client-ai-inference
description: "브라우저에서 도는 Transformers.js 온디바이스 AI 추론을 구현하는 스킬. Web Worker에서 모델 실행, 사용자 트리거 모델 다운로드(progress_callback 진행률), TextStreamer 토큰 스트리밍, worker↔메인 postMessage 메시지 계약, 취소(중단)·WebGPU/WASM 폴백·Next.js Worker 설정·엣지케이스를 다룬다. AI 문답·Transformers.js·온디바이스/클라이언트 추론·Web Worker AI·모델 다운로드·토큰 스트리밍·'기능 사용' 게이팅 구현 작업 시 반드시 사용. 후속: AI 문답 수정·재실행·스트리밍 보완·모델 교체 시에도 사용. 단, 클라우드 LLM API(OpenAI/Anthropic 등) 서버 연동에는 쓰지 않는다(그건 SSE+서버 라우트)."
---

# Client AI Inference — 브라우저 온디바이스 추론 구현

builbook의 **백엔드 없는(local-first)** 환경에서 AI 문답을 구현하는 스킬. 모델은 사용자가 버튼을 눌렀을 때 브라우저로 다운로드되고, 추론은 Web Worker 안에서 일어난다.

## 왜 SSE가 아니라 postMessage인가 (가장 먼저 이해할 것)
클라우드 LLM(OpenAI/Anthropic/OpenRouter)은 모델이 **원격 서버**에 있어 토큰을 **HTTP 위 SSE**로 흘려보낸다 — 건너야 할 네트워크 구간이 있기 때문이다. Transformers.js는 모델이 **브라우저 안**에 있어 건널 네트워크가 없다. 그래서 SSE를 쓸 수 없고, **토큰은 `TextStreamer` 콜백으로 나와 Worker가 메인 스레드로 `postMessage`** 한다. UX(또르륵 출력)는 동일하다. 이 차이를 사용자에게 설명할 때도 "전송 메커니즘만 다르고 경험은 같다"로 정리한다.

> 참고: `/Users/kimjongmin/dev/assignment`는 **회사 코드**다. 구조·파일·네이밍을 복사하지 않는다. 거기 SSE 이벤트 계약(`text_delta`/`artifact_delta`/`done`)의 *발상*과 엣지케이스 교훈만 builbook FSD로 재설계해 차용한다.

## 패키지
- `@huggingface/transformers` (Transformers.js v3+. 구 `@xenova/transformers` 아님). WebGPU + WASM 백엔드 지원.
- 설치: `npm i @huggingface/transformers`. 추가 백엔드/DB 의존성 없음.

## FSD 배치 (builbook 규약)
엔진(프레임워크 비종속)과 상태/UI를 분리한다 — 경계가 곧 메시지 계약이다.

```
src/shared/ai/
  worker.ts          # Web Worker 엔트리: 모델 로드 + 생성 + 스트리밍
  engine.ts          # 메인 스레드 쪽 래퍼: Worker 생성/메시지 송수신/취소
  messages.ts        # ★ worker↔메인 메시지 타입 SSOT (양쪽이 import)
  models.ts          # 모델 후보·기본값·런타임(device) 결정
src/features/ai-chat/
  model/useAiChat.ts # 상태 훅: 다운로드 상태·메시지 목록·스트리밍 누적·취소
  model/types.ts     # ChatMessage 등 도메인 타입
  ui/...             # (frontend-engineer와 합의) 입력창 등 기능 단위 UI
src/widgets/ai-assistant/
  ui/AiAssistant.tsx # 사이드바 패널 (게이팅 → 다운로드 → 채팅)
```
별칭: `@shared/ai`, `@features/ai-chat`, `@widgets/ai-assistant`. 위젯은 `useAiChat`만 소비하고 worker/engine 내부에 직접 접근하지 않는다.

## 메시지 계약 (worker ↔ 메인, SSOT는 `shared/ai/messages.ts`)
SSE 이벤트의 발상을 타입드 유니온으로 옮긴다. 양쪽이 같은 타입을 import해 리터럴 오타로 인한 경계면 버그를 차단한다.

```ts
// 메인 → worker
export type ToWorker =
  | { type: "load" }                                   // 모델 다운로드/로드 시작
  | { type: "generate"; id: string; messages: ChatTurn[] }
  | { type: "abort"; id: string };                     // 생성 취소

// worker → 메인
export type FromWorker =
  | { type: "progress"; file: string; loaded: number; total: number } // 다운로드 진행
  | { type: "ready" }                                  // 모델 로드 완료
  | { type: "token"; id: string; delta: string }       // 토큰 1조각 (= SSE text_delta)
  | { type: "done"; id: string; text: string }         // 생성 완료 (= SSE done)
  | { type: "error"; id?: string; message: string }
  | { type: "aborted"; id: string };

export type ChatTurn = { role: "user" | "assistant" | "system"; content: string };
```

## 모델 로드 (Worker 안, 게이팅된 다운로드)
- **게이팅:** 페이지 로드 시 모델을 받지 않는다. 메인이 `{type:"load"}`를 보낼 때만(=사용자가 "기능 사용" 클릭) 다운로드 시작.
- `progress_callback`로 파일별 진행을 받아 `progress` 메시지로 전달. 여러 파일이 병렬로 받아지므로 파일별 loaded/total을 합산해 UI가 단일 퍼센트를 계산하게 한다.
- 모델/토크나이저는 한 번만 로드해 모듈 스코프에 캐시(중복 다운로드 방지). 두 번째 `load`는 이미 ready면 즉시 `ready` 응답.
- `device`는 WebGPU 가능 시 `"webgpu"`, 아니면 `"wasm"`. `dtype`은 용량·속도 균형으로 `"q4"`(WebGPU) / `"q8"`(WASM) 권장.

```ts
import { pipeline, TextStreamer } from "@huggingface/transformers";

let generator: any = null;
async function ensureModel(post) {
  if (generator) return;
  generator = await pipeline("text-generation", MODEL_ID, {
    device: (await hasWebGPU()) ? "webgpu" : "wasm",
    dtype: "q4",
    progress_callback: (p) => {
      if (p.status === "progress")
        post({ type: "progress", file: p.file, loaded: p.loaded, total: p.total });
    },
  });
  post({ type: "ready" });
}
```

## 토큰 스트리밍 (TextStreamer → postMessage)
`TextStreamer`의 `callback_function`이 디코드된 텍스트 조각을 준다. 그걸 그대로 `token` 메시지로 흘리고, 완료 시 누적 텍스트로 `done`을 보낸다. 채팅은 `tokenizer.apply_chat_template`로 프롬프트를 만든다.

```ts
async function generate(id, messages, post) {
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    callback_function: (delta) => post({ type: "token", id, delta }),
  });
  const out = await generator(messages, { max_new_tokens: 512, streamer });
  const text = out.at(-1)?.generated_text?.at(-1)?.content ?? "";
  post({ type: "done", id, text });
}
```

## 취소 (중단)
브라우저 생성은 `stopping_criteria`로 멈춘다. 메인의 `{type:"abort", id}`를 받으면 플래그를 세우고, 다음 토큰 경계에서 생성을 중단한 뒤 `aborted` 메시지를 보낸다. UI는 abort를 보낸 즉시 스트리밍 표시를 멈춘다(낙관적). 상세 패턴은 `references/edge-cases.md`.

## 메인 스레드 래퍼 + 훅
- `engine.ts`: `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`로 생성. 메시지 핸들러를 등록하고 콜백/이벤트로 노출. SSR 가드 — Worker는 `"use client"` + 마운트 이후에만 생성.
- `useAiChat` 훅이 표현해야 하는 상태(하나라도 빠지면 UI가 멈춰 보임):
  `"idle"`(미동의) → `"downloading"`(진행률) → `"ready"` → `"generating"`(스트리밍) → `"error"`. 메시지 목록 + 현재 스트리밍 중인 assistant 텍스트를 분리 보관.

## Next.js 설정
- Next 15는 `new Worker(new URL(...))`를 기본 번들한다. 별도 로더 보통 불필요.
- WASM 자산/Node 전용 모듈 문제 시 `next.config.mjs`에서 처리(상세 `references/edge-cases.md`). **추측으로 과한 설정을 넣지 말고** 먼저 기본으로 빌드·실행해보고 실패 메시지에 따라 최소 설정만 추가한다.
- 멀티스레드 WASM(SharedArrayBuffer)을 쓸 때만 COOP/COEP 헤더가 필요하다. WebGPU/단일스레드 WASM에는 불필요하므로 기본은 넣지 않는다.

## 모델 선택
브라우저에서 현실적으로 도는 소형 instruct 모델을 기본값으로. 후보(ONNX, 작을수록 빠른 첫 다운로드):
- `onnx-community/Qwen2.5-0.5B-Instruct` — 매우 가벼움, 한국어 가능. (기본 권장)
- `HuggingFaceTB/SmolLM2-360M-Instruct` — 더 가벼움, 영어 위주.
- `onnx-community/Llama-3.2-1B-Instruct` — 품질↑, 다운로드↑.

모델 ID·용량은 사용자 경험(첫 다운로드 대기)에 직결되므로, **확정 전 사용자에게 후보를 제시해 고르게 한다**(한국어 품질 vs 다운로드 크기 트레이드오프).

## 엣지케이스 — 반드시 `references/edge-cases.md`를 읽고 반영
다운로드 중 이탈/탭 종료, 중복 load, 빈 응답, 생성 도중 에러, 취소 타이밍, WebGPU 미지원, 메모리, 첫 토큰 지연 표시, 스트리밍 자동 스크롤, 모델 로드 실패 복구 등. assignment에서 검증된 교훈(JSON 깨짐·mid-stream 중단·에러 shape 분기·페이지네이션)을 Worker 맥락으로 번역해 담았다. AI 문답 구현 시 이 파일을 먼저 읽는다.

## 작성 원칙
- 게이팅·진행률·취소·에러 4개를 빼먹지 않는다. 이게 온디바이스 AI UX의 전부다.
- 메시지 타입은 한 파일(SSOT)에서만 정의하고 양쪽이 import한다.
- 무한 스피너 금지 — 항상 "지금 무슨 단계인지" 보인다.
