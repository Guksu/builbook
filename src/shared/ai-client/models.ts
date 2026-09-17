// AI 발상에 쓰는 모델 목록과 요금 — 요청 전에 "대략 얼마"를 보여 주기 위한 값.
// 단가는 Anthropic 공개 요금(2026-09 기준, 1M 토큰당 USD). 바뀌면 여기 한 곳만 고친다.
export type AiModelChoice = "opus" | "sonnet";

export interface AiModelInfo {
  choice: AiModelChoice;
  id: string;
  label: string;
  note: string;
  inputPerM: number;
  outputPerM: number;
}

export const AI_MODELS: Record<AiModelChoice, AiModelInfo> = {
  opus: {
    choice: "opus",
    id: "claude-opus-5",
    label: "Opus 5",
    note: "품질 우선. 요청당 약 $0.03",
    inputPerM: 5,
    outputPerM: 25,
  },
  sonnet: {
    choice: "sonnet",
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    note: "빠르고 저렴. 요청당 약 $0.01",
    inputPerM: 2,
    outputPerM: 10,
  },
};

export const DEFAULT_MODEL: AiModelChoice = "opus";

export function isAiModelChoice(v: unknown): v is AiModelChoice {
  return v === "opus" || v === "sonnet";
}

/** 응답 길이 상한 — 발상 도구는 짧은 후보 몇 개면 충분하다(긴 출력 = 비용·대필 위험). */
export const MAX_OUTPUT_TOKENS = 1500;

/** 예상 비용(USD). 출력은 상한의 절반쯤 쓴다고 보고 계산한다 — "대략"이라고 표시할 것. */
export function estimateCostUsd(
  inputTokens: number,
  choice: AiModelChoice,
  outputTokens = MAX_OUTPUT_TOKENS / 2,
): number {
  const m = AI_MODELS[choice];
  return (inputTokens * m.inputPerM + outputTokens * m.outputPerM) / 1_000_000;
}

/** 한글 원고의 토큰 수 어림 — 정확한 값은 count_tokens API로 받고, 이건 그 전 임시 표시용. */
export function roughTokens(chars: number): number {
  return Math.ceil(chars / 1.5);
}

export function formatUsd(usd: number): string {
  if (usd < 0.01) return "$0.01 미만";
  return `$${usd.toFixed(2)}`;
}
