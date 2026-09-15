export type { DocumentNode, DocType } from "./model/types";
export { useDocuments, documentsKey, saveDocumentContent } from "./api/useDocuments";
export {
  collectSubtreeIds,
  selectActiveDocuments,
  selectTrashedDocuments,
  selectTrashRoots,
  flattenTree,
  type FlatNode,
} from "./lib/tree";
export { collectDescendantDocs } from "./lib/descendants";
export { measureDocument, docCount, sumDocCounts } from "./lib/count";
export { parseEpisodeNo, nextEpisodeTitle, nextFolderTitle } from "./lib/naming";
export { seedFirstEpisode } from "./api/seed";
export {
  DOCUMENT_KINDS,
  buildTemplateContent,
  defaultTitleForKind,
  isManuscript,
  kindLabel,
  type DocumentKind,
} from "./lib/templates";
