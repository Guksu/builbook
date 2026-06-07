// 메인 스레드 쪽 Worker 래퍼. UI/훅은 이 공개 API만 쓰고 worker 내부에 직접 접근하지 않는다.
// Worker는 브라우저 전용 — 반드시 마운트 이후(사용자 클릭)에 생성한다(SSR에서 호출 금지).

import type { ToWorker, FromWorker, ChatTurn } from "./messages";

export type EngineHandlers = {
  onProgress?: (loaded: number, total: number, percent: number) => void;
  onReady?: () => void;
  onToken?: (id: string, delta: string) => void;
  onDone?: (id: string, text: string) => void;
  onError?: (message: string, id?: string) => void;
  onAborted?: (id: string) => void;
};

export class AiEngine {
  private worker: Worker;

  constructor(handlers: EngineHandlers) {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      switch (m.type) {
        case "progress":
          handlers.onProgress?.(m.loaded, m.total, m.percent);
          break;
        case "ready":
          handlers.onReady?.();
          break;
        case "token":
          handlers.onToken?.(m.id, m.delta);
          break;
        case "done":
          handlers.onDone?.(m.id, m.text);
          break;
        case "error":
          handlers.onError?.(m.message, m.id);
          break;
        case "aborted":
          handlers.onAborted?.(m.id);
          break;
      }
    };

    this.worker.onerror = (e) => {
      handlers.onError?.(e.message || "AI 워커에서 오류가 발생했어요.");
    };
  }

  private send(msg: ToWorker) {
    this.worker.postMessage(msg);
  }

  /** 모델 다운로드/로드 시작 ("기능 사용" 클릭 시에만). */
  load() {
    this.send({ type: "load" });
  }

  /** 응답 생성. id는 토큰/완료를 매칭하는 키. */
  generate(id: string, messages: ChatTurn[]) {
    this.send({ type: "generate", id, messages });
  }

  /** 진행 중 생성 중단. */
  abort() {
    this.send({ type: "abort" });
  }

  /** 워커 종료(언마운트 시). */
  destroy() {
    this.worker.terminate();
  }
}
