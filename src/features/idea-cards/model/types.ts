// 영감 서랍 1층(오프라인 발상 도구)의 데이터 모양.
// 카드 덱은 앱에 내장된 정적 데이터다 — 서버도, 다운로드도 없다.

/** 장르 키. Project.genre에 그대로 저장한다(문자열이라 entities는 이 타입을 몰라도 된다). */
export type Genre = "hyeonpan" | "ropan" | "muhyeop" | "hyeondae" | "sf" | "gongpo";

/** 카드 성격 — 뽑기 결과가 한쪽으로 쏠리지 않게 태그별로 고르게 섞는다. */
export type CardTag = "사건" | "관계" | "장소" | "소재" | "제약" | "반전";

export interface IdeaCard {
  /** 장르 접두어 + 번호. 예) "hp-01". 덱 안에서 유일. */
  id: string;
  tag: CardTag;
  /** 한두 문장의 구체적 상황. 고유명사 없이 '주인공/상대/그' 같은 일반 명사만 쓴다. */
  text: string;
}

export const CARD_TAGS: readonly CardTag[] = ["사건", "관계", "장소", "소재", "제약", "반전"];
