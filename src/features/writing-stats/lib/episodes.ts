// 회차(에피소드) 분량 점검 — 순수 함수.
// 웹소설 연재는 "한 편이 몇 자인가"가 곧 품질 관리다. 플랫폼 관행상 분량은 공백을 포함해
// 세고(5,000~5,500자가 흔한 한 편), 너무 짧으면 이탈, 너무 길면 회차를 쪼개는 게 낫다.

import type { DocumentNode } from "@entities/document";
import { flattenTree, selectActiveDocuments } from "@entities/document";
import { countCharsWithSpaces, countWords, extractPlainText } from "@shared/lib";

/** 회차 목표 분량 기본값(공백 포함 글자 수). 사용자가 작품별로 바꿀 수 있다. */
export const DEFAULT_EPISODE_GOAL = 5500;

/** 목표 대비 이 비율 미만이면 '짧음', 초과하면 '긴 편'. */
const SHORT_RATIO = 0.9;
const LONG_RATIO = 1.2;

export type EpisodeStatus = "short" | "ok" | "long";

export interface EpisodeStat {
  id: string;
  title: string;
  /** 바인더 순서 기준 회차 번호(1부터). 폴더는 세지 않는다. */
  episodeNo: number;
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
): EpisodeStat[] {
  const flat = flattenTree(selectActiveDocuments(docs));
  const out: EpisodeStat[] = [];
  for (const { node } of flat) {
    if (node.type !== "DOC") continue;
    const text = extractPlainText(node.content);
    const chars = countCharsWithSpaces(text);
    out.push({
      id: node.id,
      title: node.title,
      episodeNo: out.length + 1,
      chars,
      words: countWords(text),
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
