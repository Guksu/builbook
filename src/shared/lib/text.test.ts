import { describe, it, expect } from "vitest";
import {
  extractPlainText,
  toPlainLines,
  splitPlainLines,
  countWords,
  countChars,
  countCharsWithSpaces,
} from "./text";

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

describe("countCharsWithSpaces", () => {
  it("공백을 포함해 센다(연재 플랫폼 기준)", () => {
    expect(countCharsWithSpaces("가 나 다")).toBe(5);
  });
  it("CRLF는 개행 1자로 센다(OS 차이로 분량이 달라지지 않게)", () => {
    expect(countCharsWithSpaces("가\r\n나")).toBe(3);
  });
  it("빈 문자열은 0", () => {
    expect(countCharsWithSpaces("")).toBe(0);
  });
});

describe("toPlainLines — 연재처 줄 규칙(문단 하나 = 한 줄, 빈 문단 = 빈 줄 하나)", () => {
  const p = (text?: string) => (text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" });
  const doc = (...content: unknown[]) => ({ type: "doc", content });

  it("Enter 한 번(문단 경계)은 줄바꿈 하나 — 빈 줄이 끼지 않는다", () => {
    expect(toPlainLines(doc(p("첫 줄."), p("둘째 줄.")))).toBe("첫 줄.\n둘째 줄.");
  });

  it("빈 문단(Enter 두 번)은 빈 줄 하나로 남긴다", () => {
    expect(toPlainLines(doc(p("가"), p(), p("나")))).toBe("가\n\n나");
    expect(toPlainLines(doc(p("가"), p(), p(), p("나")))).toBe("가\n\n\n나");
  });

  it("Shift+Enter(hardBreak)도 줄바꿈 하나, 굵게 등 서식은 글자만 남긴다", () => {
    const para = {
      type: "paragraph",
      content: [
        { type: "text", text: "앞" },
        { type: "hardBreak" },
        { type: "text", text: "뒤", marks: [{ type: "bold" }] },
      ],
    };
    expect(toPlainLines(doc(para))).toBe("앞\n뒤");
  });

  it("제목·인용·목록 안의 문단도 한 줄씩, 구분선은 빈 줄", () => {
    const text = toPlainLines(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "제목" }] },
        { type: "blockquote", content: [p("인용")] },
        { type: "horizontalRule" },
        { type: "bulletList", content: [{ type: "listItem", content: [p("항목")] }] },
      ),
    );
    expect(text).toBe("제목\n인용\n\n항목");
  });

  it("노드 배열(복사한 조각)도 받는다", () => {
    expect(toPlainLines([p("가"), p("나")])).toBe("가\n나");
    expect(toPlainLines(null)).toBe("");
  });
});

describe("splitPlainLines", () => {
  it("줄바꿈 하나마다 나누고 빈 줄을 지우지 않는다(CRLF 포함)", () => {
    expect(splitPlainLines("가\n나\n\n다")).toEqual(["가", "나", "", "다"]);
    expect(splitPlainLines("가\r\n나\r다")).toEqual(["가", "나", "다"]);
  });
});
