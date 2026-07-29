import { describe, it, expect } from "vitest";
import { buildPreview, formatSignedDiff } from "./snapshotText";

// ProseMirror 문서 픽스처 헬퍼
const doc = (...content: unknown[]) => ({ type: "doc", content });
const para = (text: string) => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});

describe("buildPreview", () => {
  it("개행을 공백으로 바꿔 한 줄 미리보기를 만든다", () => {
    const d = doc(para("첫 줄"), para("둘째 줄"));
    expect(buildPreview(d)).toBe("첫 줄 둘째 줄");
  });

  it("maxLen 초과분은 말줄임표로 자른다", () => {
    const d = doc(para("가나다라마바사"));
    expect(buildPreview(d, 3)).toBe("가나다…");
  });

  it("본문이 비면 안내 문구를 돌려준다", () => {
    expect(buildPreview(doc(para("")))).toBe("(빈 문서)");
  });
});

describe("formatSignedDiff", () => {
  it("양수는 + 부호", () => {
    expect(formatSignedDiff(12)).toBe("+12");
  });
  it("음수는 - 부호", () => {
    expect(formatSignedDiff(-3)).toBe("-3");
  });
  it("0은 부호 없이 0", () => {
    expect(formatSignedDiff(0)).toBe("0");
  });
});
