// 조합기 — 이 작품의 인물 카드 × 설정 카드 × 사건 유형을 무작위로 엮는다.
// 재료는 바인더의 문서(kind: character/setting)에서 제목만 가져온다.
import type { Rng } from "./draw";

export interface ComboSource {
  characters: readonly string[];
  settings: readonly string[];
  events: readonly string[];
}

export interface Combo {
  character: string;
  other: string | null;
  setting: string | null;
  event: string;
  /** "OO가 △△에서 □□와 마주친다" 꼴 한 문장. */
  text: string;
}

/** 조합에 필요한 최소 재료: 인물 1명 + 사건 1개. 설정·상대는 있으면 쓴다. */
export function canCombine(src: ComboSource): boolean {
  return src.characters.length > 0 && src.events.length > 0;
}

function one<T>(items: readonly T[], rng: Rng): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/** 받침 유무로 이/가 고르기 — 한글 음절만 본다. 그 외 문자는 "이(가)". */
export function subjectParticle(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "이(가)";
  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

export function buildCombo(src: ComboSource, rng: Rng): Combo | null {
  if (!canCombine(src)) return null;
  const character = one(src.characters, rng);
  const others = src.characters.filter((c) => c !== character);
  const other = others.length ? one(others, rng) : null;
  const setting = src.settings.length ? one(src.settings, rng) : null;
  const event = one(src.events, rng);
  const parts = [`${character}${subjectParticle(character)}`];
  if (setting) parts.push(`${setting}에서`);
  if (other) parts.push(`${other}와 함께`);
  parts.push(event);
  return { character, other, setting, event, text: parts.join(" ") + "." };
}
