// 본문 텍스트 유틸 — ProseMirror JSON → 평문, 단어/글자 세기.
// 에디터·스냅샷·검색·내보내기·통계·진단이 전부 이 규칙을 공유해야 숫자가 어긋나지 않는다.
// 그래서 특정 feature가 아니라 shared에 둔다(가장 아래 레이어 = 모두가 가져다 쓸 수 있음).

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

// 공백 기준 단어 수 — 에디터 카운터·목표 진행률의 단일 출처.
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

// 공백류를 제외한 글자 수.
export function countChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

// 공백 포함 글자 수 — 연재 플랫폼이 회차 분량을 세는 기준(예: 5,500자).
export function countCharsWithSpaces(text: string): number {
  return text.replace(/\r\n/g, "\n").length;
}
