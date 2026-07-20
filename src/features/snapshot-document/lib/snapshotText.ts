// 스냅샷 미리보기·비교를 위한 순수 함수들.
// ProseMirror JSON을 다루되 Tiptap/브라우저에 의존하지 않아 단위 테스트가 쉽다.

// 렌더 시 줄바꿈을 만드는 블록 노드 — 뒤에 개행을 붙인다.
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "codeBlock",
]);

interface PMNode {
  type?: string;
  text?: string;
  content?: unknown[];
}

function walk(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as PMNode;
  if (n.type === "text") return typeof n.text === "string" ? n.text : "";
  if (n.type === "hardBreak") return "\n";
  let out = "";
  if (Array.isArray(n.content)) out = n.content.map(walk).join("");
  if (n.type && BLOCK_TYPES.has(n.type)) out += "\n";
  return out;
}

// ProseMirror content → 평문. 블록 경계는 개행, 연속 개행은 하나로, 양끝 트림.
export function extractPlainText(content: unknown): string {
  return walk(content).replace(/\n{2,}/g, "\n").trim();
}

// 공백 기준 단어 수 — Editor의 countWords와 동일 규칙(경계면 일치).
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

// 공백류를 제외한 글자 수(한글 집필 기준의 '글자 수').
export function countChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

// 목록에 보여줄 한 줄 미리보기. 개행은 공백으로, 길면 말줄임.
export function buildPreview(content: unknown, maxLen = 140): string {
  const flat = extractPlainText(content).replace(/\n/g, " ").trim();
  if (!flat) return "(빈 문서)";
  return flat.length > maxLen ? `${flat.slice(0, maxLen)}…` : flat;
}

// 증감 표시용 부호 문자열: 12→"+12", -3→"-3", 0→"0".
export function formatSignedDiff(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
