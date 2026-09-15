export {
  safeFileName,
  documentToPlainText,
  documentToMarkdown,
  projectToPlainText,
  projectToMarkdown,
} from "./lib/exportDocuments";
export { downloadTextFile, downloadBlob, type ExportFormat } from "./lib/download";
// docx 변환은 일부러 배럴에서 빼둔다 — 재수출하면 작업실 첫 로드에 docx 패키지(수백 KB)가 실린다.
// 필요한 곳(ExportMenu)이 `import("../lib/docx")`로 눌렀을 때만 불러온다.
export { ExportMenu } from "./ui/ExportMenu";
export {
  DEFAULT_COMPILE,
  SEPARATOR_TEXT,
  compileManuscript,
  countEpisodes,
  type CompileOptions,
  type CompiledSection,
  type EpisodeSeparator,
} from "./lib/compile";
export { addPreset, removePreset, uniquePresetName, MAX_PRESETS } from "./lib/presets";
