// shared/ai 배럴 — 프레임워크 비종속 온디바이스 추론 엔진.
export { AiEngine, type EngineHandlers } from "./engine";
export type { ToWorker, FromWorker, ChatTurn } from "./messages";
export {
  MODEL_ID,
  MODEL_LABEL,
  MODEL_APPROX_MB,
  SYSTEM_PROMPT,
  GEN,
  MAX_HISTORY_TURNS,
} from "./models";
