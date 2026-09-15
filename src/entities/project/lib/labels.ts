/*
  라벨(Label) — 스크리브너의 Label을 웹소설 연재에 맞춰 단순화한 작품 단위 분류표.
  "시점: 주인공", "복선"처럼 회차를 한눈에 구분하는 색 꼬리표이고, 목록은 작품마다 따로 둔다.
  순수 로직만 둔다(저장은 entities/project/api, 표시는 widgets).
*/

/** 라벨 색 팔레트 키 — 실값은 app/globals.css의 --label-* 변수 한 곳에만 있다. */
export const LABEL_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "gray",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

/** 색 고르기 목록에 쓰는 한국어 이름. */
export const LABEL_COLOR_LABEL: Record<LabelColor, string> = {
  red: "빨강",
  orange: "주황",
  yellow: "노랑",
  green: "초록",
  blue: "파랑",
  purple: "보라",
  pink: "분홍",
  gray: "회색",
};

/** 색 키 → Tailwind 배경 유틸(토큰 매핑). 동적 문자열이 아니라 정적 표라 purge에 안전하다. */
export const LABEL_COLOR_CLASS: Record<LabelColor, string> = {
  red: "bg-label-red",
  orange: "bg-label-orange",
  yellow: "bg-label-yellow",
  green: "bg-label-green",
  blue: "bg-label-blue",
  purple: "bg-label-purple",
  pink: "bg-label-pink",
  gray: "bg-label-gray",
};

export interface ProjectLabel {
  id: string;
  name: string;
  color: LabelColor;
}

/**
 * 라벨을 한 번도 만지지 않은 작품이 쓰는 기본 목록.
 * 웹소설 연재에서 가장 자주 나누는 축(시점 / 복선 / 손봐야 할 회차)만 넣어 두고,
 * 나머지는 작가가 직접 만들게 둔다 — 빈 목록으로 시작하면 무엇을 적을지부터 막힌다.
 */
export const DEFAULT_LABELS: readonly ProjectLabel[] = [
  { id: "label-pov-hero", name: "시점: 주인공", color: "blue" },
  { id: "label-pov-heroine", name: "시점: 히로인", color: "pink" },
  { id: "label-foreshadow", name: "복선", color: "purple" },
  { id: "label-fix", name: "수정 필요", color: "orange" },
];

/** 저장된 목록이 없으면(한 번도 안 건드린 작품) 기본 목록을 쓴다. 빈 배열은 '다 지웠다'는 뜻이라 그대로 둔다. */
export function withDefaultLabels(
  labels: readonly ProjectLabel[] | undefined,
): ProjectLabel[] {
  return labels ? [...labels] : [...DEFAULT_LABELS];
}

export function isLabelColor(value: unknown): value is LabelColor {
  return LABEL_COLORS.includes(value as LabelColor);
}

/** 라벨 id로 찾기 — 없거나 지워진 id면 null(문서가 죽은 라벨을 가리켜도 화면은 멀쩡해야 한다). */
export function findLabel(
  labels: readonly ProjectLabel[] | undefined,
  id: string | null | undefined,
): ProjectLabel | null {
  if (!labels || !id) return null;
  return labels.find((l) => l.id === id) ?? null;
}

/** 라벨 추가. 이름이 비면 아무것도 하지 않는다(빈 꼬리표는 못 알아본다). */
export function addLabel(
  labels: readonly ProjectLabel[],
  input: { name: string; color: LabelColor; id?: string },
): ProjectLabel[] {
  const name = input.name.trim();
  if (!name) return [...labels];
  return [
    ...labels,
    { id: input.id ?? crypto.randomUUID(), name, color: input.color },
  ];
}

/** 이름·색 변경. 빈 이름은 무시하고, 색만 바꾸는 호출도 허용한다. */
export function renameLabel(
  labels: readonly ProjectLabel[],
  id: string,
  patch: { name?: string; color?: LabelColor },
): ProjectLabel[] {
  return labels.map((l) => {
    if (l.id !== id) return l;
    const name = patch.name?.trim();
    return {
      ...l,
      name: name ? name : l.name,
      color: patch.color ?? l.color,
    };
  });
}

/** 라벨 삭제. 이 라벨을 쓰던 문서의 참조를 비우는 건 호출부(useDocuments.clearLabelFromDocuments)가 한다. */
export function removeLabel(
  labels: readonly ProjectLabel[],
  id: string,
): ProjectLabel[] {
  return labels.filter((l) => l.id !== id);
}
