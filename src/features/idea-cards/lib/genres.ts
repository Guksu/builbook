import type { Genre } from "../model/types";

export const GENRES: readonly { value: Genre; label: string }[] = [
  { value: "hyeonpan", label: "현판" },
  { value: "ropan", label: "로판" },
  { value: "muhyeop", label: "무협" },
  { value: "hyeondae", label: "현대" },
  { value: "sf", label: "SF" },
  { value: "gongpo", label: "공포" },
];

export function isGenre(v: unknown): v is Genre {
  return typeof v === "string" && GENRES.some((g) => g.value === v);
}

export function genreLabel(genre: Genre): string {
  return GENRES.find((g) => g.value === genre)?.label ?? genre;
}
