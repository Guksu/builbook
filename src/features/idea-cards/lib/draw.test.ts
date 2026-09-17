import { describe, it, expect } from "vitest";
import { drawCards, countByTag } from "./draw";
import type { IdeaCard } from "../model/types";
import { CARD_TAGS } from "../model/types";

// 결정적 난수 — 테스트마다 같은 순서.
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const deck: IdeaCard[] = CARD_TAGS.flatMap((tag, t) =>
  Array.from({ length: 4 }, (_, i) => ({ id: `${t}-${i}`, tag, text: `${tag} ${i}` })),
);

describe("drawCards", () => {
  it("3장을 서로 다른 태그로 뽑는다", () => {
    const out = drawCards(deck, [], new Set(), seeded());
    expect(out).toHaveLength(3);
    expect(new Set(out.map((c) => c.tag)).size).toBe(3);
    expect(new Set(out.map((c) => c.id)).size).toBe(3);
  });
  it("고정한 카드는 자리를 지키고 나머지는 직전과 겹치지 않는다", () => {
    const first = drawCards(deck, [], new Set(), seeded(3));
    const second = drawCards(deck, first, new Set([first[1].id]), seeded(7));
    expect(second[1]).toEqual(first[1]);
    expect(second[0].id).not.toBe(first[0].id);
    expect(second[2].id).not.toBe(first[2].id);
    expect(second.map((c) => c.id)).not.toContain(first[0].id);
  });
  it("덱이 작으면 겹침을 허용하되 장수는 채운다", () => {
    const tiny = deck.slice(0, 3);
    const first = drawCards(tiny, [], new Set(), seeded());
    const second = drawCards(tiny, first, new Set(), seeded(5));
    expect(second).toHaveLength(3);
  });
  it("countByTag는 태그별 장수를 센다", () => {
    const counts = countByTag(deck);
    for (const tag of CARD_TAGS) expect(counts[tag]).toBe(4);
  });
});
