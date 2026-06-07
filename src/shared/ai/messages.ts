// worker ↔ 메인 메시지 계약의 단일 출처(SSOT).
// worker.ts(워커)와 engine.ts(메인)가 같은 타입을 import 해 리터럴 오타로 인한 경계면 버그를 차단한다.
// SSE 이벤트(text_delta/done)의 '발상'을 타입드 유니온으로 옮긴 것 — 전송은 SSE가 아니라 postMessage.

export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

/** 메인 → worker */
export type ToWorker =
  | { type: "load" } // 모델 다운로드/로드 시작 (= "기능 사용" 클릭)
  | { type: "generate"; id: string; messages: ChatTurn[] } // 응답 생성
  | { type: "abort" }; // 진행 중 생성 중단

/** worker → 메인 */
export type FromWorker =
  | { type: "progress"; loaded: number; total: number; percent: number } // 다운로드 진행(파일 합산)
  | { type: "ready" } // 모델 로드 완료
  | { type: "token"; id: string; delta: string } // 토큰 1조각 (= SSE text_delta)
  | { type: "done"; id: string; text: string } // 생성 완료 (= SSE done)
  | { type: "error"; id?: string; message: string }
  | { type: "aborted"; id: string };
