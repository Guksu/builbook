/// <reference lib="webworker" />
// Web Worker: Transformers.js 모델을 브라우저 안에서 로드·실행한다.
// 메인 스레드를 막지 않기 위해 모든 추론은 여기(워커)에서 일어난다.
// 토큰은 TextStreamer 콜백 → postMessage 로 메인에 흘린다(SSE 아님 — 건널 네트워크가 없다).

import {
  pipeline,
  TextStreamer,
  StoppingCriteriaList,
  InterruptableStoppingCriteria,
  type TextGenerationPipeline,
} from "@huggingface/transformers";
import { MODEL_ID, MODEL_DTYPE, GEN, ENABLE_THINKING } from "./models";
import type { ToWorker, FromWorker, ChatTurn } from "./messages";

const ctx = self as unknown as DedicatedWorkerGlobalScope;
function post(msg: FromWorker) {
  ctx.postMessage(msg);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "알 수 없는 오류";
}

let generator: TextGenerationPipeline | null = null;
let loadingPromise: Promise<void> | null = null;
const stopper = new InterruptableStoppingCriteria();
// 파일별 최신 진행률을 보관해 합산 퍼센트를 만든다(진행이 출렁이지 않도록).
const progressByFile = new Map<string, { loaded: number; total: number }>();

async function detectDevice(): Promise<"webgpu" | "wasm"> {
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };
    if (nav.gpu) {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch {
    // 무시하고 WASM 폴백
  }
  return "wasm";
}

// 모델 로드 — 중복 다운로드를 막기 위해 이미 로드됐거나 로딩 중이면 재사용한다.
async function load(): Promise<void> {
  if (generator) {
    post({ type: "ready" });
    return;
  }
  if (loadingPromise) {
    try {
      await loadingPromise;
      post({ type: "ready" });
    } catch {
      // 진행 중이던 로드가 실패하면 아래 새 시도로 떨어진다.
    }
    if (generator) return;
  }

  progressByFile.clear();
  loadingPromise = (async () => {
    const device = await detectDevice();
    generator = (await pipeline("text-generation", MODEL_ID, {
      device,
      dtype: MODEL_DTYPE,
      progress_callback: (p: {
        status: string;
        file?: string;
        loaded?: number;
        total?: number;
      }) => {
        if (
          p.status === "progress" &&
          p.file &&
          typeof p.loaded === "number" &&
          typeof p.total === "number" &&
          p.total > 0
        ) {
          progressByFile.set(p.file, { loaded: p.loaded, total: p.total });
          let loaded = 0;
          let total = 0;
          for (const v of progressByFile.values()) {
            loaded += v.loaded;
            total += v.total;
          }
          const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
          post({ type: "progress", loaded, total, percent });
        }
      },
    })) as TextGenerationPipeline;
  })();

  try {
    await loadingPromise;
    post({ type: "ready" });
  } catch (err) {
    generator = null;
    post({ type: "error", message: `모델을 불러오지 못했어요: ${errMsg(err)}` });
  } finally {
    loadingPromise = null;
  }
}

async function generate(id: string, messages: ChatTurn[]): Promise<void> {
  if (!generator) {
    post({ type: "error", id, message: "모델이 아직 준비되지 않았어요." });
    return;
  }
  stopper.reset();

  let text = "";
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (delta: string) => {
      if (!delta) return;
      text += delta; // 조각은 append만 — 공백·줄바꿈 보존
      post({ type: "token", id, delta });
    },
  });

  const stoppingCriteria = new StoppingCriteriaList();
  stoppingCriteria.push(stopper);

  try {
    await generator(messages as unknown as string, {
      max_new_tokens: GEN.maxNewTokens,
      do_sample: GEN.doSample,
      temperature: GEN.temperature,
      top_p: GEN.topP,
      top_k: GEN.topK,
      repetition_penalty: GEN.repetitionPenalty,
      streamer,
      stopping_criteria: stoppingCriteria,
      // Qwen3 thinking 비활성: 파이프라인이 이 kwargs를 apply_chat_template로 그대로 전달한다.
      // enable_thinking=false면 chat_template이 빈 <think></think>를 넣어 추론을 건너뛰고 바로 답한다.
      tokenizer_encode_kwargs: { enable_thinking: ENABLE_THINKING },
    } as Record<string, unknown>);
  } catch (err) {
    // 생성 도중 에러 — 쌓인 부분 텍스트는 메인이 이미 받았다(보존됨).
    post({ type: "error", id, message: errMsg(err) });
    return;
  }

  if (stopper.interrupted) {
    post({ type: "aborted", id });
    return;
  }
  post({ type: "done", id, text });
}

ctx.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case "load":
      void load();
      break;
    case "generate":
      void generate(msg.id, msg.messages);
      break;
    case "abort":
      stopper.interrupt(); // 다음 토큰 경계에서 생성 중단
      break;
  }
};
