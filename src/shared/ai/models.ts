// 브라우저 온디바이스 모델 설정. 모델 ID·용량은 사용자 경험(첫 다운로드 대기)에 직결된다.
// 사용자 확정: Llama-3.2-1B-Instruct (한국어 품질 우선, 다운로드 ~수백 MB).

export const MODEL_ID = "onnx-community/Llama-3.2-1B-Instruct";
export const MODEL_LABEL = "Llama 3.2 1B Instruct";
/** 대략적인 다운로드 용량(MB) — 안내용. q4 양자화 기준 어림값. */
export const MODEL_APPROX_MB = 800;

/** WebGPU에서는 q4, WASM 폴백에서도 q4(속도/용량 균형). worker가 device를 런타임 결정. */
export const MODEL_DTYPE = "q4" as const;

export const SYSTEM_PROMPT =
  "당신은 웹소설 집필을 돕는 한국어 AI 어시스턴트입니다. " +
  "작가의 질문(설정, 플롯, 묘사, 문장 다듬기 등)에 간결하고 구체적으로 답하세요. " +
  "사용자가 쓰는 언어로 답합니다.";

/** 생성 파라미터. max_new_tokens는 탭이 얼지 않도록 합리적으로 제한. */
export const GEN = {
  maxNewTokens: 512,
  doSample: true,
  temperature: 0.7,
  topP: 0.9,
} as const;

/** 컨텍스트 폭주 방지 — 최근 N턴만 프롬프트에 싣는다(system 제외). */
export const MAX_HISTORY_TURNS = 8;
