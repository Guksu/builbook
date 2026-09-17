"use client";

// AI 발상 훅 — 상태 머신(reducer) + 실제 호출(shared/ai-client)을 잇는다.
// 화면은 이 훅의 공개 API만 쓴다. 키가 바뀌면 상태도 따라간다.
import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  classifyAiError,
  countInputTokens,
  streamCompletion,
  useApiKey,
  clearApiKey,
  type AiModelChoice,
} from "@shared/ai-client";
import { SYSTEM_PROMPT, buildUserMessage, type AiTaskKey, type TaskExtra } from "../lib/prompts";
import type { AiContext } from "../lib/context";
import { INITIAL_AI_STATE, aiReducer, type AiState } from "./reducer";

export interface UseIdeaAi {
  state: AiState;
  apiKey: string | null;
  /** 작업을 고르면 보낼 내용을 만들어 확인 단계로 간다(토큰 수는 비동기로 채운다). */
  prepare: (task: AiTaskKey, ctx: AiContext, extra?: TaskExtra) => void;
  cancelConfirm: () => void;
  send: () => void;
  abort: () => void;
  reset: () => void;
  forgetKey: () => void;
}

export function useIdeaAi(model: AiModelChoice): UseIdeaAi {
  const apiKey = useApiKey();
  const [state, dispatch] = useReducer(aiReducer, INITIAL_AI_STATE);
  const abortRef = useRef<AbortController | null>(null);
  // 최신 값을 ref로 — send는 확인 화면의 pending을 읽어야 하고, 리스너를 매번 새로 만들 이유는 없다.
  const latest = useRef({ apiKey, model, state });
  latest.current = { apiKey, model, state };

  useEffect(() => {
    dispatch({ type: "key-changed", hasKey: !!apiKey });
  }, [apiKey]);

  const prepare = useCallback((task: AiTaskKey, ctx: AiContext, extra?: TaskExtra) => {
    const message = buildUserMessage(task, ctx, extra);
    dispatch({ type: "prepare", task, message });
    const { apiKey: key, model: m } = latest.current;
    if (!key) return;
    void countInputTokens({ apiKey: key, model: m, system: SYSTEM_PROMPT, user: message }).then(
      (n) => dispatch({ type: "counted", task, inputTokens: n }),
    );
  }, []);

  const send = useCallback(() => {
    const { apiKey: key, model: m, state: s } = latest.current;
    if (!key || s.status !== "confirm" || !s.pending) return;
    const { message } = s.pending;
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "send" });
    let text = "";
    streamCompletion(
      { apiKey: key, model: m, system: SYSTEM_PROMPT, user: message },
      (acc) => {
        text = acc;
        dispatch({ type: "chunk", text: acc });
      },
      controller.signal,
    )
      .then((result) => {
        dispatch({ type: "finished", text: result.text, refused: result.stopReason === "refusal" });
      })
      .catch(async (err: unknown) => {
        const error = await classifyAiError(err);
        if (error.kind === "aborted") dispatch({ type: "aborted", text });
        else dispatch({ type: "failed", error, text });
        // 키가 틀렸으면 키를 지워 입력 화면으로 돌아간다(이유는 상태에 남는다).
        if (error.kind === "auth") clearApiKey();
      })
      .finally(() => {
        if (abortRef.current === controller) abortRef.current = null;
      });
  }, []);

  const abort = useCallback(() => abortRef.current?.abort(), []);
  const cancelConfirm = useCallback(() => dispatch({ type: "cancel-confirm" }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const forgetKey = useCallback(() => {
    abortRef.current?.abort();
    clearApiKey();
  }, []);

  // 패널을 닫으면(언마운트) 진행 중 요청도 끊는다.
  useEffect(() => () => abortRef.current?.abort(), []);

  return { state, apiKey, prepare, cancelConfirm, send, abort, reset, forgetKey };
}
