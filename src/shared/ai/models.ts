// 브라우저 온디바이스 모델 설정. 모델 ID·용량은 사용자 경험(첫 다운로드 대기)에 직결된다.
// 현재 모델: onnx-community/Qwen3-0.6B-ONNX (arch=Qwen3ForCausalLM → transformers.js v4.2.0 정식 지원,
// chat_template 포함, model_q4.onnx 존재 ≈919MB). Qwen2.5-0.5B 대비 세대 업 + 한국어 향상 기대.
//
// 이력:
//   Llama-3.2-1B-Instruct (q4 ~800MB)       — 로드/코히런트 OK, 한국어 약함 → 교체.
//   onnx-community/EXAONE-3.5-2.4B-Instruct  — OOM (std::bad_alloc).
//   onnx-community/Qwen2.5-1.5B-Instruct q4f16(WebGPU) — 로드되나 gibberish(이 어댑터 fp16 불안정).
//   onnx-community/Qwen2.5-1.5B-Instruct q4 (~1.1GB)   — OOM (std::bad_alloc).
//   onnx-community/Qwen2.5-0.5B-Instruct q4 (786MB)    — 이 기기 천장 내 검증 모델(로드 확인).
//   onnx-community/Qwen3-0.6B-ONNX q4 (919MB)          — Qwen2.5-0.5B→Qwen3-0.6B 시도.
//     천장 786~1100MB 사이는 미지수(786MB 확인 로드 / 1.1GB OOM). 사용자 결정 2026-06-09.
//     OOM 발생 시 즉시 Qwen2.5-0.5B로 롤백(노트 "OOM 시 롤백" 참조).
//
// 한국어 특화 소형 후보(HyperCLOVAX/Kanana/EXAONE 소형)는 q4 ONNX 부재 또는 천장 초과로 전부 탈락(노트 참조).

export const MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";
export const MODEL_LABEL = "Qwen3 0.6B";
/** 대략적인 다운로드 용량(MB) — 안내용. model_q4.onnx 실측 ≈ 919MB. */
export const MODEL_APPROX_MB = 919;

// 양자화는 q4 단일. q4f16(fp16 혼합)은 이 기기 WebGPU 어댑터에서 수치가 불안정해 생성이
// gibberish(무작위 문자)로 나온다(실측 확인). q4(비-f16)는 안정적이므로 device 무관하게 q4 고정.
// ※ q4f16은 절대 쓰지 말 것 — 용량은 작지만(483MB) 출력이 깨진다.
export const MODEL_DTYPE = "q4" as const;

export const SYSTEM_PROMPT =
  "당신은 웹소설 집필을 돕는 한국어 AI 어시스턴트입니다. " +
  "작가의 질문(설정, 플롯, 묘사, 문장 다듬기 등)에 간결하고 구체적으로 답하세요. " +
  "사용자가 쓰는 언어로 답합니다.";

/** Qwen3 thinking 모드 비활성.
 *  Qwen3는 기본적으로 응답 앞에 <think>...</think> 추론을 생성한다 — 집필 보조에선
 *  (a) 512 토큰 예산을 추론에 낭비하고 (b) 추론 trace가 사용자에게 노출될 수 있어 부적합.
 *  → false로 직접 답하게 한다. worker가 pipeline의 tokenizer_encode_kwargs.enable_thinking로 전달
 *    (transformers.js text-generation 파이프라인이 이 kwarg를 apply_chat_template에 그대로 넘김 — src 확인).
 *  Qwen3 chat_template은 enable_thinking=false면 빈 <think>\n\n</think>를 프롬프트에 넣어 추론을 건너뛴다. */
export const ENABLE_THINKING = false;

/** 생성 파라미터. max_new_tokens는 탭이 얼지 않도록 합리적으로 제한.
 *  Qwen3 비-thinking 공식 권장값: temperature 0.7 / top_p 0.8 / top_k 20.
 *  repetition_penalty는 소형 모델 반복 루프 억제용으로 1.1 유지(과하지 않게 완화). */
export const GEN = {
  maxNewTokens: 512,
  doSample: true,
  temperature: 0.7,
  topP: 0.8,
  topK: 20,
  repetitionPenalty: 1.1,
} as const;

/** 컨텍스트 폭주 방지 — 최근 N턴만 프롬프트에 싣는다(system 제외). */
export const MAX_HISTORY_TURNS = 8;
