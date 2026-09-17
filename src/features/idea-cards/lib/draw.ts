// 카드 뽑기 — 순수 함수. 난수는 밖에서 주입해 테스트가 결정적이 되게 한다.
import type { CardTag, IdeaCard } from "../model/types";
import { CARD_TAGS } from "../model/types";

export type Rng = () => number;

/** 0 이상 n 미만 정수. */
function pick(rng: Rng, n: number): number {
  return Math.min(n - 1, Math.floor(rng() * n));
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pick(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const DRAW_COUNT = 3;

/**
 * 덱에서 count장을 뽑는다. 고정(locked)한 카드는 자리를 지키고, 나머지 자리만 새로 뽑는다.
 * - 새로 뽑는 카드는 고정 카드·직전 카드와 겹치지 않는다(덱이 모자라면 겹침 허용).
 * - 태그가 한쪽으로 쏠리지 않게, 고정 카드에 없는 태그를 우선한다.
 */
export function drawCards(
  deck: readonly IdeaCard[],
  previous: readonly (IdeaCard | null)[],
  lockedIds: ReadonlySet<string>,
  rng: Rng,
  count = DRAW_COUNT,
): IdeaCard[] {
  const result: (IdeaCard | null)[] = Array.from({ length: count }, (_, i) => {
    const prev = previous[i] ?? null;
    return prev && lockedIds.has(prev.id) ? prev : null;
  });
  const exclude = new Set<string>();
  for (const c of previous) if (c) exclude.add(c.id);
  for (const c of result) if (c) exclude.add(c.id);

  const usedTags = new Set<CardTag>(result.filter((c): c is IdeaCard => !!c).map((c) => c.tag));
  const fresh = shuffle(deck.filter((c) => !exclude.has(c.id)), rng);
  const fallback = shuffle(deck.filter((c) => !result.some((r) => r?.id === c.id)), rng);

  for (let i = 0; i < count; i++) {
    if (result[i]) continue;
    // 아직 안 나온 태그의 카드를 먼저 찾고, 없으면 아무 카드나.
    const idx = fresh.findIndex((c) => !usedTags.has(c.tag));
    const card = idx >= 0 ? fresh.splice(idx, 1)[0] : fresh.shift() ?? fallback.shift() ?? null;
    if (!card) continue;
    result[i] = card;
    usedTags.add(card.tag);
  }
  return result.filter((c): c is IdeaCard => !!c);
}

/** 태그별 장수 — 덱 검수용. */
export function countByTag(deck: readonly IdeaCard[]): Record<CardTag, number> {
  const out = Object.fromEntries(CARD_TAGS.map((t) => [t, 0])) as Record<CardTag, number>;
  for (const c of deck) out[c.tag] = (out[c.tag] ?? 0) + 1;
  return out;
}
