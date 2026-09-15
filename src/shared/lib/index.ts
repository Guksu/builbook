// 도메인 비종속 순수 유틸 배럴 — `import { extractPlainText } from "@shared/lib"`
export {
  extractPlainText,
  countWords,
  countChars,
  countCharsWithSpaces,
  measureText,
  pickCount,
  formatCount,
  unitSuffix,
  unitLabel,
  isCountUnit,
  COUNT_UNITS,
  DEFAULT_COUNT_UNIT,
  ZERO_MEASURE,
  type CountUnit,
  type TextMeasure,
} from "./text";
