// 회차(에피소드) 분량 점검 — 순수 함수.
// 웹소설 연재는 "한 편이 몇 자인가"가 곧 품질 관리다. 플랫폼 관행상 분량은 공백을 포함해
// 세고(5,000~5,500자가 흔한 한 편), 너무 짧으면 이탈, 너무 길면 회차를 쪼개는 게 낫다.

import type { DocumentNode } from "@entities/document";
import { flattenTree, selectActiveDocuments } from "@entities/document";
import {
  extractPlainText,
  measureText,
  pickCount,
  type CountUnit,
} from "@shared/lib";

/** 회차 목표 분량 기본값(공백 포함 글자 수). 사용자가 작품별로 바꿀 수 있다. */
export const DEFAULT_EPISODE_GOAL = 5500;

/**
 * 플랫폼별 회차 분량 프리셋. 숫자마다 근거를 적는다 — 공식 페이지를 이 환경에서 직접 열 수
 * 없었던 항목은 "검색 요약"이라고 밝힌다(2026-09-15 조사). 값이 바뀌면 여기만 고친다.
 */
export interface EpisodePreset {
  id: string;
  label: string;
  goal: number;
  /** 이 숫자가 어떤 단위인지 — 프리셋을 고르면 분량 단위 설정도 이 값으로 맞춘다. */
  unit: CountUnit;
  source: string;
}

export const EPISODE_PRESETS: readonly EpisodePreset[] = [
  {
    id: "common-5000",
    label: "일반 기준 5,000자",
    goal: 5000,
    unit: "chars",
    source: "공백 포함. 여러 플랫폼에서 한 회차 기준으로 흔히 쓰는 값(관행, PYOZI 블로그 '웹소설 1화 분량 글자수' 검색 요약).",
  },
  {
    id: "default-5500",
    label: "기본 5,500자",
    goal: DEFAULT_EPISODE_GOAL,
    unit: "chars",
    source: "공백 포함. 이 앱의 기본값(5,000~5,500자 관행의 위쪽).",
  },
  {
    id: "novelpia-3000",
    label: "노벨피아 최소 3,000자",
    goal: 3000,
    unit: "charsNoSpace",
    source: "공백 제외. 노벨피아 FAQ '글자수 기준은 무엇인가요?' 검색 요약 기준 — 원문 페이지는 직접 확인하지 못했으니 플랫폼 공지로 다시 확인하세요.",
  },
];

/** 목표 대비 이 비율 미만이면 '짧음', 초과하면 '긴 편'. */
const SHORT_RATIO = 0.9;
const LONG_RATIO = 1.2;

export type EpisodeStatus = "short" | "ok" | "long";

export interface EpisodeStat {
  id: string;
  title: string;
  /** 바인더 순서 기준 회차 번호(1부터). 폴더는 세지 않는다. */
  episodeNo: number;
  /** 사용자 설정 단위 기준 분량(기본: 공백 포함 글자 수). */
  chars: number;
  words: number;
  /** 목표 대비 %(정수). 목표가 없으면 0. */
  percent: number;
  status: EpisodeStatus;
}

export function episodeStatus(chars: number, goal: number): EpisodeStatus {
  if (goal <= 0) return "ok"; // 목표가 없으면 판정하지 않는다
  if (chars < goal * SHORT_RATIO) return "short";
  if (chars > goal * LONG_RATIO) return "long";
  return "ok";
}

/**
 * 바인더 순서대로 본문 문서를 훑어 회차별 분량표를 만든다(휴지통·폴더 제외).
 * 정렬을 flattenTree에 맡겨 바인더에 보이는 순서와 표의 순서가 항상 같다.
 */
export function buildEpisodeStats(
  docs: readonly DocumentNode[],
  goal: number,
  unit: CountUnit = "chars",
): EpisodeStat[] {
  const flat = flattenTree(selectActiveDocuments(docs));
  const out: EpisodeStat[] = [];
  for (const { node } of flat) {
    if (node.type !== "DOC") continue;
    const measure = measureText(extractPlainText(node.content));
    // 표의 분량은 사용자 설정 단위를 따른다(목표도 같은 단위로 해석).
    const chars = pickCount(measure, unit);
    out.push({
      id: node.id,
      title: node.title,
      episodeNo: out.length + 1,
      chars,
      words: measure.words,
      percent: goal > 0 ? Math.round((chars / goal) * 100) : 0,
      status: episodeStatus(chars, goal),
    });
  }
  return out;
}

export interface EpisodeSummary {
  count: number;
  totalChars: number;
  averageChars: number;
  short: number;
  long: number;
  ok: number;
}

export function summarizeEpisodes(stats: readonly EpisodeStat[]): EpisodeSummary {
  const totalChars = stats.reduce((sum, s) => sum + s.chars, 0);
  return {
    count: stats.length,
    totalChars,
    averageChars: stats.length ? Math.round(totalChars / stats.length) : 0,
    short: stats.filter((s) => s.status === "short").length,
    long: stats.filter((s) => s.status === "long").length,
    ok: stats.filter((s) => s.status === "ok").length,
  };
}

const STATUS_LABEL: Record<EpisodeStatus, string> = {
  short: "짧음",
  ok: "적정",
  long: "긴 편",
};

export const episodeStatusLabel = (status: EpisodeStatus) => STATUS_LABEL[status];
