// 색 키 → Tailwind 클래스. 문자열을 그대로 써야 Tailwind가 클래스를 생성하므로 표로 둔다.
// 값은 라벨 색 토큰(--label-*) 하나를 인물 노드(라벨 색)와 관계선(종류 색)이 같이 쓴다.
export const NODE_FILL_CLASS: Record<string, string> = {
  red: "fill-label-red",
  orange: "fill-label-orange",
  yellow: "fill-label-yellow",
  green: "fill-label-green",
  blue: "fill-label-blue",
  purple: "fill-label-purple",
  pink: "fill-label-pink",
  gray: "fill-label-gray",
};

export const EDGE_TEXT_CLASS: Record<string, string> = {
  red: "text-label-red",
  orange: "text-label-orange",
  yellow: "text-label-yellow",
  green: "text-label-green",
  blue: "text-label-blue",
  purple: "text-label-purple",
  pink: "text-label-pink",
  gray: "text-fg-weak",
};

export const DOT_BG_CLASS: Record<string, string> = {
  red: "bg-label-red",
  orange: "bg-label-orange",
  yellow: "bg-label-yellow",
  green: "bg-label-green",
  blue: "bg-label-blue",
  purple: "bg-label-purple",
  pink: "bg-label-pink",
  gray: "bg-label-gray",
};
