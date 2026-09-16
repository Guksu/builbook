// 본문 표시 설정 — 순수 정의. 값은 CSS로만 반영되고 저장 데이터엔 영향이 없다.
import { isOneOf } from "@shared/lib";

export const FONT_SIZES = ["sm", "md", "lg", "xl"] as const;
export const LINE_HEIGHTS = ["normal", "relaxed", "loose"] as const;
export const WIDTHS = ["narrow", "normal", "wide"] as const;

export type FontSize = (typeof FONT_SIZES)[number];
export type LineHeight = (typeof LINE_HEIGHTS)[number];
export type EditorWidth = (typeof WIDTHS)[number];

export interface FocusSettings {
  fontSize: FontSize;
  lineHeight: LineHeight;
  width: EditorWidth;
  /** 타이프라이터 스크롤 — 집중 모드에서 커서 줄을 화면 가운데에 둔다. */
  typewriter: boolean;
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  fontSize: "md",
  lineHeight: "relaxed",
  width: "normal",
  typewriter: false,
};

export const FONT_SIZE_PX: Record<FontSize, number> = { sm: 15, md: 17, lg: 19, xl: 22 };
export const LINE_HEIGHT_VALUE: Record<LineHeight, number> = { normal: 1.6, relaxed: 1.85, loose: 2.1 };
export const WIDTH_PX: Record<EditorWidth, number> = { narrow: 600, normal: 720, wide: 900 };

export const FONT_SIZE_LABEL: Record<FontSize, string> = { sm: "작게", md: "보통", lg: "크게", xl: "아주 크게" };
export const LINE_HEIGHT_LABEL: Record<LineHeight, string> = { normal: "촘촘", relaxed: "보통", loose: "넓게" };
export const WIDTH_LABEL: Record<EditorWidth, string> = { narrow: "좁게", normal: "보통", wide: "넓게" };

const isFontSize = isOneOf(FONT_SIZES);
const isLineHeight = isOneOf(LINE_HEIGHTS);
const isWidth = isOneOf(WIDTHS);

export function isFocusSettings(v: unknown): v is FocusSettings {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isFontSize(o.fontSize) &&
    isLineHeight(o.lineHeight) &&
    isWidth(o.width) &&
    typeof o.typewriter === "boolean"
  );
}

/** 에디터에 넣을 인라인 스타일 값. */
export function focusStyle(s: FocusSettings): { fontSize: string; lineHeight: number; maxWidth: string } {
  return {
    fontSize: `${FONT_SIZE_PX[s.fontSize]}px`,
    lineHeight: LINE_HEIGHT_VALUE[s.lineHeight],
    maxWidth: `${WIDTH_PX[s.width]}px`,
  };
}
