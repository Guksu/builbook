import { describe, it, expect } from "vitest";
import {
  extractPlainText,
  countWords,
  countChars,
  buildPreview,
  formatSignedDiff,
} from "./snapshotText";

// ProseMirror 문서 픽스처 헬퍼
const doc = (...content: unknown[]) => ({ type: "doc", content });
const para = (text: string) => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});
const heading = (text: string) => ({
  type: "heading",
  attrs: { level: 1 },
  content: [{ type: "text", text }],
});

describe("extractPlainText", () => {
  it("문단 텍스트를 추출한다", () => {
    expect(extractPlainText(para("안녕 세상"))).toBe("안녕 세상");
  });

  it("여러 블록을 개행으로 잇는다", () => {
    const d = doc(heading("제목"), para("본문 첫 줄"), para("둘째 줄"));
    expect(extractPlainText(d)).toBe("제목\n본문 첫 줄\n둘째 줄");
  });

  it("중첩 마크(볼드 등)의 여러 text 조각을 이어 붙인다", () => {
    const d = doc({
      type: "paragraph",
      content: [
        { type: "text", text: "보통 " },
        { type: "text", marks: [{ type: "bold" }], text: "굵게" },
        { type: "text", text: " 끝" },
      ],
    });
    expect(extractPlainText(d)).toBe("보통 굵게 끝");
  });

  it("리스트 항목을 각각 한 줄로 추출한다", () => {
    const d = doc({
      type: "bulletList",
      content: [
        { type: "listItem", content: [para("사과")] },
        { type: "listItem", content: [para("배")] },
      ],
    });
    expect(extractPlainText(d)).toBe("사과\n배");
  });

  it("hardBreak는 개행이 된다", () => {
    const d = doc({
      type: "paragraph",
      content: [
        { type: "text", text: "위" },
        { type: "hardBreak" },
        { type: "text", text: "아래" },
      ],
    });
    expect(extractPlainText(d)).toBe("위\n아래");
  });

  it("빈 문단만 있으면 빈 문자열", () => {
    expect(extractPlainText(doc(para("")))).toBe("");
  });

  it("null·비객체 입력은 빈 문자열(방어)", () => {
    expect(extractPlainText(null)).toBe("");
    expect(extractPlainText(undefined)).toBe("");
    expect(extractPlainText("문자열")).toBe("");
    expect(extractPlainText(42)).toBe("");
  });
});

describe("countWords", () => {
  it("공백 기준 단어 수(에디터와 동일 규칙)", () => {
    expect(countWords("어두운 밤 이야기는 시작")).toBe(4);
  });
  it("빈/공백 문자열은 0", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
  it("앞뒤·중간 다중 공백을 무시한다", () => {
    expect(countWords("  하나   둘  ")).toBe(2);
  });
});

describe("countChars", () => {
  it("공백을 제외한 글자 수", () => {
    expect(countChars("가 나 다")).toBe(3);
  });
  it("개행·탭도 제외한다", () => {
    expect(countChars("가\n나\t다")).toBe(3);
  });
  it("빈 문자열은 0", () => {
    expect(countChars("")).toBe(0);
  });
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
