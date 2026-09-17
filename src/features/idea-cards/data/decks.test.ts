import { describe, it, expect } from "vitest";
import { DECKS, QUESTION_CARDS, EVENT_TYPES } from "./index";
import { GENRES } from "../lib/genres";
import { countByTag } from "../lib/draw";
import { CARD_TAGS } from "../model/types";

// 내장 덱의 형식 검수 — 장수·태그 균형·id 유일·길이·고유명사(큰따옴표) 여부.
describe("built-in decks", () => {
  for (const { value, label } of GENRES) {
    it(`${label} 덱은 60장, 태그별 10장, id·본문 유일`, () => {
      const deck = DECKS[value];
      expect(deck).toHaveLength(60);
      const counts = countByTag(deck);
      for (const tag of CARD_TAGS) expect(counts[tag]).toBe(10);
      expect(new Set(deck.map((c) => c.id)).size).toBe(60);
      expect(new Set(deck.map((c) => c.text)).size).toBe(60);
      for (const c of deck) {
        expect(c.text.length).toBeGreaterThanOrEqual(20);
        expect(c.text.length).toBeLessThanOrEqual(80);
        expect(c.text).not.toContain('"');
      }
    });
  }
  it("질문 카드·사건 유형이 준비돼 있다", () => {
    expect(QUESTION_CARDS.length).toBeGreaterThanOrEqual(10);
    expect(EVENT_TYPES.length).toBeGreaterThanOrEqual(10);
  });
});
