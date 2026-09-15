// 찾기·바꾸기 — 순수 계산(lib) / ProseMirror 연결(model) / 바 UI(ui)
export {
  findMatches,
  findMatchesInChunks,
  stepMatchIndex,
  planReplaceAll,
  replaceAllInText,
  type FindOptions,
  type TextChunk,
  type TextMatch,
  type DocMatch,
} from "./lib/findMatches";
export {
  FindHighlight,
  findHighlightKey,
  findMatchesInDoc,
  collectTextChunks,
  setFindHighlight,
  clearFindHighlight,
} from "./model/findHighlight";
export { replaceMatch, replaceAllMatches } from "./model/applyReplace";
export { FindReplaceBar, type FindReplaceBarProps } from "./ui/FindReplaceBar";
