import { describe, expect, it } from "vitest";
import { clearsConflict, conflictsWithMine, shouldAnswerBusy } from "./protocol";

const me = { tabId: "A", documentId: "doc1" };

describe("tab-guard protocol", () => {
  it("다른 탭이 같은 문서를 열면 충돌", () => {
    expect(conflictsWithMine({ type: "open", tabId: "B", documentId: "doc1" }, me)).toBe(true);
    expect(conflictsWithMine({ type: "busy", tabId: "B", documentId: "doc1" }, me)).toBe(true);
  });
  it("내 메시지·다른 문서·닫힘은 충돌 아님", () => {
    expect(conflictsWithMine({ type: "open", tabId: "A", documentId: "doc1" }, me)).toBe(false);
    expect(conflictsWithMine({ type: "open", tabId: "B", documentId: "doc2" }, me)).toBe(false);
    expect(conflictsWithMine({ type: "close", tabId: "B", documentId: "doc1" }, me)).toBe(false);
  });
  it("문서를 안 열었으면 아무것도 충돌 아님", () => {
    const idle = { tabId: "A", documentId: null };
    expect(conflictsWithMine({ type: "open", tabId: "B", documentId: "doc1" }, idle)).toBe(false);
  });
  it("open에만 busy로 답한다", () => {
    expect(shouldAnswerBusy({ type: "open", tabId: "B", documentId: "doc1" }, me)).toBe(true);
    expect(shouldAnswerBusy({ type: "busy", tabId: "B", documentId: "doc1" }, me)).toBe(false);
  });
  it("다른 탭이 그 문서를 닫으면 경고 해제", () => {
    expect(clearsConflict({ type: "close", tabId: "B", documentId: "doc1" }, me)).toBe(true);
    expect(clearsConflict({ type: "close", tabId: "B", documentId: "doc2" }, me)).toBe(false);
    expect(clearsConflict({ type: "close", tabId: "A", documentId: "doc1" }, me)).toBe(false);
  });
});
