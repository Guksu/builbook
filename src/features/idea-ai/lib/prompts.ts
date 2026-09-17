// AI 발상 작업 6종의 프롬프트. 시스템 프롬프트는 고정(캐시), 작품 맥락은 user 메시지에 구조화.
// 원칙: 결정은 작가가 한다 — 후보를 내놓되 본문을 대신 쓰지 않는다.
import type { AiContext } from "./context";

export type AiTaskKey = "next" | "cliff" | "describe" | "dialogue" | "title" | "interrogate";

export interface AiTask {
  key: AiTaskKey;
  label: string;
  description: string;
  /** 선택 문단이 꼭 필요한 작업(없으면 버튼을 잠근다). */
  needsSelection: boolean;
  /** 인물 카드와 질문이 필요한 작업. */
  needsCharacter: boolean;
}

export const AI_TASKS: readonly AiTask[] = [
  { key: "next", label: "다음 전개 3안", description: "지금 장면 뒤에 올 수 있는 전개 셋과 각각의 대가", needsSelection: false, needsCharacter: false },
  { key: "cliff", label: "반전·클리프행어", description: "이 회차를 끝맺을 후보 셋", needsSelection: false, needsCharacter: false },
  { key: "describe", label: "묘사 다듬기", description: "선택 문단을 다른 결(긴장/서정)로 2안 — 원문은 그대로", needsSelection: true, needsCharacter: false },
  { key: "dialogue", label: "대사 대안", description: "선택한 대사를 인물 말투에 맞게 3가지로", needsSelection: true, needsCharacter: false },
  { key: "title", label: "회차 제목 후보", description: "본문을 바탕으로 제목 5개", needsSelection: false, needsCharacter: false },
  { key: "interrogate", label: "인물 심문", description: "인물 카드를 근거로, 그 인물 시점의 답", needsSelection: false, needsCharacter: true },
];

export function findTask(key: AiTaskKey): AiTask {
  return AI_TASKS.find((t) => t.key === key) ?? AI_TASKS[0];
}

export const SYSTEM_PROMPT = [
  "당신은 한국 웹소설 연재 작가의 발상 보조자다.",
  "규칙:",
  "1. 결정은 작가가 한다. 후보를 내놓되 본문을 대신 쓰지 않는다. 회차 전체를 쓰지 않는다.",
  "2. 작가가 준 설정·인물·문체를 존중한다. 없는 설정을 사실처럼 단정하지 않는다.",
  "3. 한국어로, 짧고 구체적으로 답한다. 서론·사과·설명은 뺀다.",
  "4. 형식은 요청마다 지정한다. 지정된 개수와 형식만 지킨다.",
  "5. 원문 문장을 그대로 반복하지 않는다(다듬기 작업은 예외 — 같은 뜻의 다른 문장을 낸다).",
].join("\n");

export interface TaskExtra {
  /** 인물 심문: 인물 이름과 카드 내용. */
  characterName?: string;
  characterCard?: string;
  question?: string;
}

function section(title: string, body: string): string {
  return body ? `## ${title}\n${body}\n` : "";
}

const FORMAT: Record<AiTaskKey, string> = {
  next: "다음 전개 후보 3개. 각 후보는 '번호. 제목 — 2~3문장 요약' 뒤에 '대가: 한 줄'을 붙인다. 총 200자 이내 후보 3개.",
  cliff: "회차 끝맺음 후보 3개. 각 후보는 '번호. 마지막 장면 요약(2문장)' 뒤에 '독자가 궁금해할 것: 한 줄'.",
  describe: "선택 문단을 같은 뜻으로 다시 쓴 2안. 'A. 긴장' 결과 'B. 서정' 결로. 각 안은 원문과 비슷한 길이. 그 외 설명 없음.",
  dialogue: "선택한 대사의 대안 3개. 각 줄은 '번호. 대사' 한 줄. 화자의 말투·관계를 지킨다. 그 외 설명 없음.",
  title: "회차 제목 후보 5개. 각 줄 '번호. 제목'. 15자 이내. 그 외 설명 없음.",
  interrogate: "인물 카드에 적힌 그 인물의 1인칭 시점으로 질문에 답한다. 3~5문장. 카드에 없는 사실은 '카드에 없음'이라고 밝힌다.",
};

/** user 메시지 본문 — 미리보기 화면에 그대로 보여 준다(작가가 무엇을 보내는지 안다). */
export function buildUserMessage(task: AiTaskKey, ctx: AiContext, extra: TaskExtra = {}): string {
  const parts: string[] = [];
  parts.push(section("작품", ctx.projectTitle));
  if (ctx.synopsis) parts.push(section("회차 시놉시스", ctx.synopsis));
  if (task === "interrogate") {
    parts.push(section("인물 카드", `${extra.characterName ?? ""}\n${extra.characterCard ?? ""}`.trim()));
    if (ctx.body) parts.push(section("참고 본문", ctx.body));
    parts.push(section("질문", extra.question ?? ""));
  } else {
    if (ctx.characters) parts.push(section("인물 카드", ctx.characters));
    if (ctx.settings && (task === "next" || task === "cliff")) parts.push(section("설정 카드", ctx.settings));
    const bodyTitle =
      ctx.bodySource === "selection" ? "선택 문단" : ctx.documentTitle ? `본문 (${ctx.documentTitle})` : "본문";
    parts.push(section(bodyTitle, ctx.body));
  }
  parts.push(`## 요청\n${FORMAT[task]}`);
  return parts.filter(Boolean).join("\n");
}
