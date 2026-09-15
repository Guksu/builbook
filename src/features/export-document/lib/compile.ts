// 컴파일(내보내기) 옵션 — 스크리브너 Compile의 핵심만: 회차 범위, 회차 구분선, 제목 포함 여부.
// 순수 함수. TXT·마크다운·DOCX 변환기가 전부 이 결과(섹션 목록)를 소비해 옵션 해석이 한 곳에 모인다.

import type { DocumentNode } from "@entities/document";
import { collectSubtreeIds, flattenTree, isManuscript, selectActiveDocuments } from "@entities/document";
import { extractPlainText } from "@shared/lib";

export type EpisodeSeparator = "none" | "blank" | "stars";

export interface CompileOptions {
  /** 회차 범위(1부터, 원고 문서만 센다). null이면 처음/끝. */
  fromEpisode: number | null;
  toEpisode: number | null;
  separator: EpisodeSeparator;
  /** 회차 제목 포함. 플랫폼 편집기에 붙여 넣을 땐 빼는 경우가 많다. */
  includeTitles: boolean;
  /** 폴더(부·장) 제목 포함. */
  includeFolders: boolean;
  includeProjectTitle: boolean;
}

export const DEFAULT_COMPILE: CompileOptions = {
  fromEpisode: null,
  toEpisode: null,
  separator: "none",
  includeTitles: true,
  includeFolders: true,
  includeProjectTitle: true,
};

export const SEPARATOR_TEXT = "* * *";

export interface CompiledSection {
  kind: "project" | "folder" | "episode";
  title: string;
  body: string;
  /** 트리 깊이(작품 제목 0, 최상위 노드 1…). 마크다운·DOCX 제목 단계에 쓴다. */
  depth: number;
  episodeNo?: number;
  /** 이 회차 앞에 구분선을 넣을지(첫 회차 제외, separator가 none이 아닐 때). */
  separatorBefore?: boolean;
}

/** 원고(회차) 수 — 범위 입력의 상한. */
export function countEpisodes(docs: readonly DocumentNode[]): number {
  return flattenTree(selectActiveDocuments(docs)).filter(
    ({ node }) => node.type === "DOC" && isManuscript(node),
  ).length;
}

function clampRange(from: number | null, to: number | null, total: number): [number, number] {
  const f = Math.max(1, Math.min(total, Math.floor(from ?? 1)));
  const t = Math.max(f, Math.min(total, Math.floor(to ?? total)));
  return [f, t];
}

export function compileManuscript(
  projectTitle: string,
  docs: readonly DocumentNode[],
  opts: CompileOptions = DEFAULT_COMPILE,
): CompiledSection[] {
  const active = selectActiveDocuments(docs);
  const flat = flattenTree(active);
  const total = countEpisodes(active);
  const [from, to] = total > 0 ? clampRange(opts.fromEpisode, opts.toEpisode, total) : [0, -1];

  // 1) 포함될 회차 id를 먼저 정한다(폴더 포함 여부는 자손 회차가 있는지로 결정).
  const included = new Set<string>();
  let no = 0;
  const episodeNoById = new Map<string, number>();
  for (const { node } of flat) {
    if (node.type !== "DOC" || !isManuscript(node)) continue;
    no += 1;
    episodeNoById.set(node.id, no);
    if (no >= from && no <= to) included.add(node.id);
  }

  const out: CompiledSection[] = [];
  if (opts.includeProjectTitle) out.push({ kind: "project", title: projectTitle, body: "", depth: 0 });
  let seenEpisode = false;
  for (const { node, depth } of flat) {
    if (node.type === "FOLDER") {
      if (!opts.includeFolders) continue;
      const hasIncluded = collectSubtreeIds(active, node.id).some((id) => included.has(id));
      if (!hasIncluded) continue;
      out.push({ kind: "folder", title: node.title, body: "", depth: depth + 1 });
      continue;
    }
    if (!included.has(node.id)) continue;
    out.push({
      kind: "episode",
      title: opts.includeTitles ? node.title : "",
      body: extractPlainText(node.content),
      depth: depth + 1,
      episodeNo: episodeNoById.get(node.id),
      separatorBefore: seenEpisode && opts.separator !== "none",
    });
    seenEpisode = true;
  }
  return out;
}
