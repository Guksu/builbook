import { describe, it, expect } from "vitest";
import { buildUserMessage, AI_TASKS, findTask } from "./prompts";
import type { AiContext } from "./context";

const ctx: AiContext = {
  projectTitle: "회귀한 검사",
  body: "그는 검을 들었다.",
  bodySource: "selection",
  bodyTruncated: false,
  documentTitle: "3화",
  synopsis: "복수의 시작",
  characters: "- 테아르: 검사",
  settings: "- 검은 탑: 마탑",
};

describe("prompts", () => {
  it("작업 6종, 선택 필요 작업은 2개", () => {
    expect(AI_TASKS).toHaveLength(6);
    expect(AI_TASKS.filter((t) => t.needsSelection).map((t) => t.key)).toEqual(["describe", "dialogue"]);
    expect(findTask("title").label).toBe("회차 제목 후보");
  });
  it("메시지는 작품·시놉시스·인물·본문·요청 순으로 구조화된다", () => {
    const msg = buildUserMessage("next", ctx);
    expect(msg.indexOf("## 작품")).toBeLessThan(msg.indexOf("## 회차 시놉시스"));
    expect(msg.indexOf("## 인물 카드")).toBeLessThan(msg.indexOf("## 선택 문단"));
    expect(msg).toContain("## 설정 카드");
    expect(msg.trim().endsWith("총 200자 이내 후보 3개.")).toBe(true);
  });
  it("제목 후보는 설정 카드를 보내지 않는다(불필요한 전송 최소화)", () => {
    expect(buildUserMessage("title", ctx)).not.toContain("## 설정 카드");
  });
  it("인물 심문은 고른 인물 카드와 질문을 보낸다", () => {
    const msg = buildUserMessage("interrogate", ctx, {
      characterName: "테아르",
      characterCard: "검사. 복수심.",
      question: "왜 돌아왔나?",
    });
    expect(msg).toContain("## 인물 카드\n테아르\n검사. 복수심.");
    expect(msg).toContain("## 질문\n왜 돌아왔나?");
    expect(msg).toContain("## 참고 본문");
  });
  it("본문이 없으면 본문 절이 빠진다", () => {
    const msg = buildUserMessage("next", { ...ctx, body: "", bodySource: "none" });
    expect(msg).not.toContain("## 본문");
  });
});
