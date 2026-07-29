export {
  analyzeTerms,
  editDistance,
  isCorrectUse,
  toScanDocs,
  tokenize,
  type ConsistencyReport,
  type TermUsage,
  type VariantHit,
} from "./lib/variants";
export {
  ENDING_RUN_THRESHOLD,
  LONG_SENTENCE_CHARS,
  analyzeSentences,
  endingOf,
  findEndingRuns,
  findRepeatedWords,
  isDialogueLine,
  splitSentences,
  type EndingRun,
  type RepeatedWord,
  type SentenceReport,
} from "./lib/sentences";
