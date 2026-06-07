"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AiEngine,
  SYSTEM_PROMPT,
  MAX_HISTORY_TURNS,
  type ChatTurn,
} from "@shared/ai";
import type { AiStatus, ChatMessage } from "./types";

const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export interface UseAiChat {
  status: AiStatus;
  /** 0~100 다운로드 진행률. */
  percent: number;
  messages: ChatMessage[];
  /** 현재 생성 중인 assistant 부분 텍스트(빈 문자열이면 "생각 중"). */
  streaming: string;
  error: string | null;
  /** "기능 사용" — 모델 다운로드/로드 시작. */
  enable: () => void;
  /** 메시지 전송(ready 상태에서만). */
  send: (text: string) => void;
  /** 생성 중단. */
  stop: () => void;
  /** 로드 실패 후 재시도. */
  retry: () => void;
}

export function useAiChat(): UseAiChat {
  const [status, setStatus] = useState<AiStatus>("idle");
  const [percent, setPercent] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<AiEngine | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const streamingRef = useRef("");

  // 생성 종료 처리 — 한 곳에서만 assistant 메시지를 확정한다.
  const finalize = useCallback(
    (text: string, opts: { partial?: boolean } = {}) => {
      const content = text.trim();
      activeIdRef.current = null;
      streamingRef.current = "";
      setStreaming("");
      setStatus("ready");
      // 빈 응답(중단·실패로 한 글자도 못 받음)은 메시지를 만들지 않는다.
      if (!content) return;
      setMessages((prev) => [
        ...prev,
        { id: genId(), role: "assistant", content, partial: opts.partial },
      ]);
    },
    [],
  );

  const ensureEngine = useCallback((): AiEngine => {
    if (engineRef.current) return engineRef.current;
    const engine = new AiEngine({
      onProgress: (_l, _t, p) => setPercent(p),
      onReady: () => {
        setStatus("ready");
        setError(null);
      },
      onToken: (id, delta) => {
        if (id !== activeIdRef.current) return; // 취소/이전 생성의 잔여 토큰 드롭
        streamingRef.current += delta;
        setStreaming(streamingRef.current);
      },
      onDone: (id, text) => {
        if (id !== activeIdRef.current) return;
        finalize(text || streamingRef.current);
      },
      onAborted: (id) => {
        if (id !== activeIdRef.current) return;
        finalize(streamingRef.current, { partial: true });
      },
      onError: (message, id) => {
        // 생성 중 에러: 부분 텍스트는 보존하고 입력을 다시 연다(상태 ready).
        if (activeIdRef.current && (id === activeIdRef.current || id == null)) {
          finalize(streamingRef.current, { partial: true });
          setError(message);
          return;
        }
        // 로드 단계 에러: 복구 필요.
        setStatus("error");
        setError(message);
      },
    });
    engineRef.current = engine;
    return engine;
  }, [finalize]);

  const enable = useCallback(() => {
    if (status === "downloading") return; // 중복 다운로드 방지
    setError(null);
    setPercent(0);
    setStatus("downloading");
    ensureEngine().load();
  }, [status, ensureEngine]);

  const retry = enable;

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || status !== "ready" || !engineRef.current) return;

      const userMsg: ChatMessage = { id: genId(), role: "user", content };
      const history = [...messages, userMsg];
      setMessages(history);
      setError(null);

      const id = genId();
      activeIdRef.current = id;
      streamingRef.current = "";
      setStreaming("");
      setStatus("generating");

      const recent = history.slice(-MAX_HISTORY_TURNS);
      const turns: ChatTurn[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ];
      engineRef.current.generate(id, turns);
    },
    [messages, status],
  );

  const stop = useCallback(() => {
    if (status !== "generating") return;
    engineRef.current?.abort();
    // 낙관적 종료 — 즉시 멈춘 것으로 보이게 하고, 이후 도착하는 토큰은 activeId 불일치로 드롭.
    finalize(streamingRef.current, { partial: true });
  }, [status, finalize]);

  // 언마운트 시 워커 정리. (작업실에서는 훅을 view 레벨에 두어 패널 토글로는 언마운트되지 않는다.)
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return {
    status,
    percent,
    messages,
    streaming,
    error,
    enable,
    send,
    stop,
    retry,
  };
}
