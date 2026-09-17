import type { Genre, IdeaCard } from "../model/types";
import { DECK_HYEONPAN } from "./hyeonpan";
import { DECK_ROPAN } from "./ropan";
import { DECK_MUHYEOP } from "./muhyeop";
import { DECK_HYEONDAE } from "./hyeondae";
import { DECK_SF } from "./sf";
import { DECK_GONGPO } from "./gongpo";

export const DECKS: Record<Genre, readonly IdeaCard[]> = {
  hyeonpan: DECK_HYEONPAN,
  ropan: DECK_ROPAN,
  muhyeop: DECK_MUHYEOP,
  hyeondae: DECK_HYEONDAE,
  sf: DECK_SF,
  gongpo: DECK_GONGPO,
};

export function deckFor(genre: Genre): readonly IdeaCard[] {
  return DECKS[genre];
}

export { QUESTION_CARDS, EVENT_TYPES } from "./questions";
