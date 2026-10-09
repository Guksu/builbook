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

// ── 연재처 줄 규칙 평문 ────────────────────────────────────────────────────
// 붙여넣기(클립보드)·TXT 내보내기용. 노벨피아·문피아·네이버 시리즈 입력창처럼
// "Enter 한 번 = 다음 줄"이 되도록 문단 하나를 한 줄로, 빈 문단(Enter 두 번)은 빈 줄 하나로 둔다.
// extractPlainText와 다르다 — 그쪽은 분량·검색용이라 빈 줄을 접는다(바꾸면 글자 수가 달라진다).
// 에디터 기본 복사는 문단 사이를 "\n\n"으로 이어(prosemirror-view serializeForClipboard),
// 연재처에 붙이면 한 줄 바꿈이 빈 줄 낀 두 줄이 됐다(2026-10 사용자 확인).

const LINE_BLOCK_TYPES = new Set(["paragraph", "heading", "codeBlock"]);

function inlineText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as PMNode;
  if (n.type === "text") return typeof n.text === "string" ? n.text : "";
  if (n.type === "hardBreak") return "\n";
  return Array.isArray(n.content) ? n.content.map(inlineText).join("") : "";
}

function collectLines(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  const n = node as PMNode;
  if (n.type && LINE_BLOCK_TYPES.has(n.type)) {
    out.push(inlineText(n));
    return;
  }
  // 구분선은 평문에 그릴 수 없으니 빈 줄로 남긴다(장면 전환 자리가 사라지지 않게).
  if (n.type === "horizontalRule") {
    out.push("");
    return;
  }
  if (Array.isArray(n.content)) for (const child of n.content) collectLines(child, out);
}

/** ProseMirror content(문서 또는 노드 배열) → 연재처 줄 규칙 평문. 앞뒤를 자르지 않는다. */
export function toPlainLines(content: unknown): string {
  const lines: string[] = [];
  if (Array.isArray(content)) for (const node of content) collectLines(node, lines);
  else collectLines(content, lines);
  return lines.join("\n");
}

/** 평문 → 줄 배열(빈 줄 유지). 붙여넣은 글을 문단으로 나눌 때 쓴다 — 줄 하나 = 문단 하나. */
export function splitPlainLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
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

// ── 분량 단위 ──────────────────────────────────────────────────────────────
// 한국 웹소설 플랫폼은 회차 분량을 '글자 수'로 센다(공백 포함이 흔하고, 노벨피아처럼 공백
// 제외인 곳도 있다). 그래서 앱의 기본 단위는 공백 포함 글자 수이고, 사용자가 바꿀 수 있다.
export type CountUnit = "chars" | "charsNoSpace" | "words";

export interface TextMeasure {
  words: number;
  chars: number; // 공백 포함 글자 수
  charsNoSpace: number; // 공백 제외 글자 수
}

export const DEFAULT_COUNT_UNIT: CountUnit = "chars";

export const COUNT_UNITS: readonly { value: CountUnit; label: string; suffix: string }[] = [
  { value: "chars", label: "글자 수 (공백 포함)", suffix: "자" },
  { value: "charsNoSpace", label: "글자 수 (공백 제외)", suffix: "자" },
  { value: "words", label: "단어 수", suffix: "단어" },
];

export const ZERO_MEASURE: TextMeasure = { words: 0, chars: 0, charsNoSpace: 0 };

// 한 번 훑어 세 가지 수치를 모두 만든다 — 저장 시 함께 기록해 단위를 바꿔도 다시 셀 필요가 없다.
export function measureText(text: string): TextMeasure {
  return {
    words: countWords(text),
    chars: countCharsWithSpaces(text),
    charsNoSpace: countChars(text),
  };
}

export function isCountUnit(value: unknown): value is CountUnit {
  return COUNT_UNITS.some((u) => u.value === value);
}

export function pickCount(m: TextMeasure, unit: CountUnit): number {
  return m[unit];
}

export function unitSuffix(unit: CountUnit): string {
  return COUNT_UNITS.find((u) => u.value === unit)?.suffix ?? "자";
}

export function unitLabel(unit: CountUnit): string {
  return COUNT_UNITS.find((u) => u.value === unit)?.label ?? "글자 수";
}

// "1,234자" / "12단어" — 숫자 표기 규칙의 단일 출처.
export function formatCount(n: number, unit: CountUnit): string {
  const safe = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return `${safe.toLocaleString("ko-KR")}${unitSuffix(unit)}`;
}
