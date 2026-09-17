export {
  buildContext,
  tailTruncate,
  headTruncate,
  MAX_BODY_CHARS,
  MAX_SIDE_CHARS,
  type AiContext,
  type ContextInput,
} from "./lib/context";
export {
  AI_TASKS,
  SYSTEM_PROMPT,
  buildUserMessage,
  findTask,
  type AiTask,
  type AiTaskKey,
  type TaskExtra,
} from "./lib/prompts";
export { aiReducer, INITIAL_AI_STATE, type AiState, type AiStatus, type AiAction } from "./model/reducer";
export { useIdeaAi, type UseIdeaAi } from "./model/useIdeaAi";
