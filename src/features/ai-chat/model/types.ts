export type AiStatus =
  | "idle" // 미동의 — 모델 미다운로드
  | "downloading" // 모델 다운로드/로드 중
  | "ready" // 사용 준비됨
  | "generating" // 응답 생성(스트리밍) 중
  | "error"; // 로드 실패 등 복구 필요

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** 생성이 중단/실패해 부분 응답인 경우 표시용. */
  partial?: boolean;
}
