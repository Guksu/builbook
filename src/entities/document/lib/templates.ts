// 문서 템플릿 — 스크리브너 "Templates" 폴더의 발상을 웹소설에 맞게 셋으로 줄였다.
// 회차(빈 본문) / 인물 카드 / 설정 카드. 본문은 ProseMirror JSON으로 만들어 그대로 저장한다.
// 카드 종류(kind)는 문서에 남겨 회차 분량표·내보내기에서 원고가 아닌 것을 걸러내는 데 쓴다.

import { nextEpisodeTitle } from "./naming";

export type DocumentKind = "episode" | "character" | "setting";

export const DOCUMENT_KINDS: readonly { value: DocumentKind; label: string; description: string }[] = [
  { value: "episode", label: "회차", description: "빈 본문. 이름은 다음 회차 번호로." },
  { value: "character", label: "인물 카드", description: "이름·외모·성격·목표·관계·메모 틀." },
  { value: "setting", label: "설정 카드", description: "명칭·분류·설명·규칙·등장 회차 틀." },
];

export const kindLabel = (kind: DocumentKind) =>
  DOCUMENT_KINDS.find((k) => k.value === kind)?.label ?? "회차";

/** 원고(회차)인가 — kind가 없는 옛 문서는 회차로 본다. */
export function isManuscript(doc: { kind?: string }): boolean {
  return doc.kind === undefined || doc.kind === "episode";
}

type PMNode = { type: string; attrs?: Record<string, unknown>; content?: PMNode[]; text?: string };

const heading = (text: string, level = 2): PMNode => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});
const paragraph = (text?: string): PMNode =>
  text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" };

const CHARACTER_SECTIONS: [string, string][] = [
  ["이름", "이름과 부르는 말(별명·호칭)."],
  ["나이·외모", "첫 등장 때 독자가 보는 모습 한두 줄."],
  ["성격", "말버릇, 버릇, 남들이 오해하는 점."],
  ["원하는 것", "이 인물이 끝까지 밀고 가는 목표. 막는 것은 무엇인가."],
  ["관계", "주인공과의 관계, 첫 만남 회차."],
  ["메모", ""],
];

const SETTING_SECTIONS: [string, string][] = [
  ["명칭", "정본 표기와 허용 표기(사전에도 등록하세요)."],
  ["분류", "지명 / 조직 / 능력 / 물건 / 규칙."],
  ["설명", "독자에게 처음 보여줄 때 필요한 만큼만."],
  ["규칙·제약", "할 수 있는 것과 없는 것. 대가는 무엇인가."],
  ["등장 회차", ""],
];

function sectionsToDoc(sections: [string, string][]): PMNode {
  const content: PMNode[] = [];
  for (const [title, hint] of sections) {
    content.push(heading(title));
    content.push(paragraph(hint || undefined));
  }
  return { type: "doc", content };
}

export function buildTemplateContent(kind: DocumentKind): unknown {
  switch (kind) {
    case "character":
      return sectionsToDoc(CHARACTER_SECTIONS);
    case "setting":
      return sectionsToDoc(SETTING_SECTIONS);
    default:
      return { type: "doc", content: [{ type: "paragraph" }] };
  }
}

/** 종류별 기본 제목 — 회차는 다음 번호, 카드는 겹치지 않는 "새 인물"/"새 설정". */
export function defaultTitleForKind(
  kind: DocumentKind,
  siblings: readonly { title: string; type?: string }[],
): string {
  if (kind === "episode") return nextEpisodeTitle(siblings);
  const base = kind === "character" ? "새 인물" : "새 설정";
  const taken = new Set(siblings.map((s) => s.title.trim()));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}
