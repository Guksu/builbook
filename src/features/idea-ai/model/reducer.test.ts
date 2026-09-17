import { describe, it, expect } from "vitest";
import { aiReducer, INITIAL_AI_STATE, type AiState } from "./reducer";

const ready: AiState = { ...INITIAL_AI_STATE, status: "ready" };

describe("aiReducer", () => {
  it("키가 생기면 ready, 사라지면 no-key로 초기화", () => {
    expect(aiReducer(INITIAL_AI_STATE, { type: "key-changed", hasKey: true }).status).toBe("ready");
    const s = aiReducer({ ...ready, output: "결과" }, { type: "key-changed", hasKey: false });
    expect(s.status).toBe("no-key");
    expect(s.output).toBe("");
    // 401 이유는 키가 지워져도 남는다
    const auth = aiReducer(
      { ...ready, error: { kind: "auth", message: "틀림" } },
      { type: "key-changed", hasKey: false },
    );
    expect(auth.error?.message).toBe("틀림");
  });
  it("prepare → confirm → send → streaming → finished → done", () => {
    let s = aiReducer(ready, { type: "prepare", task: "next", message: "m" });
    expect(s.status).toBe("confirm");
    s = aiReducer(s, { type: "counted", task: "next", inputTokens: 1200 });
    expect(s.pending?.inputTokens).toBe(1200);
    s = aiReducer(s, { type: "send" });
    expect(s.status).toBe("streaming");
    s = aiReducer(s, { type: "chunk", text: "첫" });
    s = aiReducer(s, { type: "finished", text: "첫 번째", refused: false });
    expect(s).toMatchObject({ status: "done", output: "첫 번째", partial: false, pending: null });
  });
  it("다른 작업의 토큰 수는 무시한다(늦게 도착한 응답)", () => {
    const s = aiReducer(ready, { type: "prepare", task: "next", message: "m" });
    expect(aiReducer(s, { type: "counted", task: "title", inputTokens: 9 }).pending?.inputTokens).toBeNull();
  });
  it("확인 취소는 이전 결과가 있으면 done, 없으면 ready", () => {
    const s = aiReducer(ready, { type: "prepare", task: "next", message: "m" });
    expect(aiReducer(s, { type: "cancel-confirm" }).status).toBe("ready");
    expect(aiReducer({ ...s, output: "이전" }, { type: "cancel-confirm" }).status).toBe("done");
  });
  it("중단은 부분 결과를 보존하고 done", () => {
    let s = aiReducer(ready, { type: "prepare", task: "next", message: "m" });
    s = aiReducer(s, { type: "send" });
    s = aiReducer(s, { type: "aborted", text: "반쯤" });
    expect(s).toMatchObject({ status: "done", output: "반쯤", partial: true });
  });
  it("401 실패는 키 입력 화면으로, 그 외는 error", () => {
    let s = aiReducer(ready, { type: "prepare", task: "next", message: "m" });
    s = aiReducer(s, { type: "send" });
    const auth = aiReducer(s, { type: "failed", error: { kind: "auth", message: "x" }, text: "" });
    expect(auth.status).toBe("no-key");
    expect(auth.error?.kind).toBe("auth");
    const rate = aiReducer(s, { type: "failed", error: { kind: "rate", message: "x" }, text: "일부" });
    expect(rate).toMatchObject({ status: "error", output: "일부", partial: true });
  });
  it("streaming 중에는 prepare를 받지 않는다(연타 방지)", () => {
    let s = aiReducer(ready, { type: "prepare", task: "next", message: "m" });
    s = aiReducer(s, { type: "send" });
    expect(aiReducer(s, { type: "prepare", task: "title", message: "t" })).toBe(s);
  });
});
