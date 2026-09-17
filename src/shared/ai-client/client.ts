// Anthropic SDK를 브라우저에서 직접 쓴다 — 서버 없음. SDK는 필요할 때만 불러온다(번들 분리).
// 작가 본인의 키가 본인 브라우저에서 Anthropic으로 바로 간다.
import type { AiModelChoice } from "./models";
import { AI_MODELS, MAX_OUTPUT_TOKENS } from "./models";

export type AiErrorKind = "auth" | "rate" | "network" | "aborted" | "server" | "bad-request" | "unknown";

export interface AiError {
  kind: AiErrorKind;
  message: string;
}

export interface AiRequest {
  apiKey: string;
  model: AiModelChoice;
  system: string;
  user: string;
}

export interface AiResult {
  text: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
}

async function loadSdk() {
  const mod = await import("@anthropic-ai/sdk");
  return mod.default;
}

async function makeClient(apiKey: string) {
  const Anthropic = await loadSdk();
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

/** SDK 오류를 화면 문구로 바꿀 수 있는 종류로 나눈다. */
export async function classifyAiError(err: unknown): Promise<AiError> {
  const Anthropic = await loadSdk();
  if (err instanceof Anthropic.APIUserAbortError) return { kind: "aborted", message: "중단했어요." };
  if (err instanceof Anthropic.AuthenticationError)
    return { kind: "auth", message: "API 키가 맞지 않아요. 키를 다시 확인해 주세요." };
  if (err instanceof Anthropic.PermissionDeniedError)
    return { kind: "auth", message: "이 키로는 요청할 권한이 없어요." };
  if (err instanceof Anthropic.RateLimitError)
    return { kind: "rate", message: "요청 한도에 걸렸어요. 잠시 뒤 다시 시도해 주세요." };
  if (err instanceof Anthropic.BadRequestError)
    return { kind: "bad-request", message: `요청이 거부됐어요. ${err.message}` };
  if (err instanceof Anthropic.InternalServerError)
    return { kind: "server", message: "Anthropic 서버 문제예요. 잠시 뒤 다시 시도해 주세요." };
  if (err instanceof Anthropic.APIConnectionError)
    return { kind: "network", message: "인터넷 연결을 확인해 주세요." };
  if (err instanceof DOMException && err.name === "AbortError")
    return { kind: "aborted", message: "중단했어요." };
  return { kind: "unknown", message: err instanceof Error ? err.message : "알 수 없는 오류예요." };
}

/** 보내기 전 입력 토큰 수 — 예상 비용 표시용. 실패하면 null(표시는 어림값으로). */
export async function countInputTokens(req: AiRequest): Promise<number | null> {
  try {
    const client = await makeClient(req.apiKey);
    const res = await client.messages.countTokens({
      model: AI_MODELS[req.model].id,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });
    return res.input_tokens;
  } catch {
    return null;
  }
}

/**
 * 스트리밍 요청. 토큰이 올 때마다 onText(누적 텍스트)를 부른다.
 * 중단은 signal로 — 중단돼도 그때까지의 텍스트는 호출부가 갖고 있다.
 */
export async function streamCompletion(
  req: AiRequest,
  onText: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<AiResult> {
  const client = await makeClient(req.apiKey);
  const stream = client.messages.stream(
    {
      model: AI_MODELS[req.model].id,
      max_tokens: MAX_OUTPUT_TOKENS,
      // 시스템 프롬프트는 고정 문자열이라 캐시 대상으로 표시한다(같은 세션에서 반복 요청 시 절감).
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: req.user }],
    },
    { signal },
  );
  let text = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      text += event.delta.text;
      onText(text);
    }
  }
  const final = await stream.finalMessage();
  return {
    text,
    stopReason: final.stop_reason,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  };
}
