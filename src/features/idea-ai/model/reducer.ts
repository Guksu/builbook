// AI 탭 상태 머신 — 명세 5장 상태표 그대로. 순수 함수라 단위 테스트로 전이를 못 박는다.
import type { AiError } from "@shared/ai-client";
import type { AiTaskKey } from "../lib/prompts";

export type AiStatus = "no-key" | "ready" | "confirm" | "streaming" | "done" | "error";

export interface PendingRequest {
  task: AiTaskKey;
  /** 실제로 보낼 user 메시지(미리보기에 그대로 표시). */
  message: string;
  /** count_tokens 결과. 아직이면 null(어림값 표시). */
  inputTokens: number | null;
}

export interface AiState {
  status: AiStatus;
  pending: PendingRequest | null;
  /** 스트리밍 중·완료 후 결과 텍스트. 중단해도 남는다. */
  output: string;
  /** 마지막 결과가 어떤 작업이었나(메모 저장 시 출처). */
  outputTask: AiTaskKey | null;
  partial: boolean;
  refused: boolean;
  error: AiError | null;
}

export type AiAction =
  | { type: "key-changed"; hasKey: boolean }
  | { type: "prepare"; task: AiTaskKey; message: string }
  | { type: "counted"; task: AiTaskKey; inputTokens: number | null }
  | { type: "cancel-confirm" }
  | { type: "send" }
  | { type: "chunk"; text: string }
  | { type: "finished"; text: string; refused: boolean }
  | { type: "aborted"; text: string }
  | { type: "failed"; error: AiError; text: string }
  | { type: "reset" };

export const INITIAL_AI_STATE: AiState = {
  status: "no-key",
  pending: null,
  output: "",
  outputTask: null,
  partial: false,
  refused: false,
  error: null,
};

export function aiReducer(state: AiState, action: AiAction): AiState {
  switch (action.type) {
    case "key-changed":
      // 키가 사라져도 "키가 틀렸다"는 이유는 남겨 둔다(401 → 키 지움 → 입력 화면에 이유 표시).
      if (!action.hasKey)
        return { ...INITIAL_AI_STATE, status: "no-key", error: state.error?.kind === "auth" ? state.error : null };
      return state.status === "no-key" ? { ...state, status: "ready" } : state;
    case "prepare":
      if (state.status === "no-key" || state.status === "streaming") return state;
      return {
        ...state,
        status: "confirm",
        pending: { task: action.task, message: action.message, inputTokens: null },
        error: null,
      };
    case "counted":
      if (state.status !== "confirm" || state.pending?.task !== action.task) return state;
      return { ...state, pending: { ...state.pending, inputTokens: action.inputTokens } };
    case "cancel-confirm":
      if (state.status !== "confirm") return state;
      return { ...state, status: state.output ? "done" : "ready", pending: null };
    case "send":
      if (state.status !== "confirm" || !state.pending) return state;
      return {
        ...state,
        status: "streaming",
        output: "",
        outputTask: state.pending.task,
        partial: false,
        refused: false,
        error: null,
      };
    case "chunk":
      if (state.status !== "streaming") return state;
      return { ...state, output: action.text };
    case "finished":
      if (state.status !== "streaming") return state;
      return { ...state, status: "done", pending: null, output: action.text, refused: action.refused };
    case "aborted":
      if (state.status !== "streaming") return state;
      return { ...state, status: "done", pending: null, output: action.text, partial: true };
    case "failed":
      if (state.status !== "streaming" && state.status !== "confirm") return state;
      // 401은 키 문제 — 키 입력 화면으로 되돌린다.
      if (action.error.kind === "auth") return { ...INITIAL_AI_STATE, status: "no-key", error: action.error };
      return { ...state, status: "error", pending: null, output: action.text, partial: !!action.text, error: action.error };
    case "reset":
      return { ...INITIAL_AI_STATE, status: "ready" };
    default:
      return state;
  }
}
