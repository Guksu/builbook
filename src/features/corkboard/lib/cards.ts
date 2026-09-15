// 코르크보드 카드 변환 — 순수 함수.
// 스크리브너의 코르크보드는 "본문을 읽지 않고 이야기 흐름만 본다"가 핵심이다.
// 그래서 카드에 담는 건 제목·시놉시스·분량·진행 상태뿐이다.

import type { DocumentNode, DocType } from "@entities/document";
import { collectSubtreeIds, flattenTree, selectActiveDocuments } from "@entities/document";
import { extractPlainText, measureText, ZERO_MEASURE, type TextMeasure } from "@shared/lib";

/** 문서 진행 상태 — 초고 → 퇴고 → 완료 순환. 미설정은 '초고'로 본다. */
export type DocStatus = "draft" | "revise" | "done";

export const DOC_STATUS_ORDER: readonly DocStatus[] = ["draft", "revise", "done"];

const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "초고",
  revise: "퇴고",
  done: "완료",
};

export const docStatusLabel = (status: DocStatus) => STATUS_LABEL[status];

export function normalizeStatus(value: unknown): DocStatus {
  return DOC_STATUS_ORDER.includes(value as DocStatus) ? (value as DocStatus) : "draft";
}

/** 상태 칩을 누를 때마다 다음 상태로. 완료 다음은 다시 초고(되돌릴 길을 막지 않는다). */
export function nextStatus(current: unknown): DocStatus {
  const idx = DOC_STATUS_ORDER.indexOf(normalizeStatus(current));
  return DOC_STATUS_ORDER[(idx + 1) % DOC_STATUS_ORDER.length];
}

export interface CardItem {
  id: string;
  title: string;
  type: DocType;
  /** 트리 깊이 — 카드 들여쓰기/그룹 헤더 표현용. */
  depth: number;
  /** 시놉시스가 없으면 빈 문자열(카드는 안내 문구를 대신 보여준다). */
  synopsis: string;
  measure: TextMeasure;
  status: DocStatus;
  /** 라벨 id(없으면 undefined) — 색·이름은 작품의 라벨 목록에서 찾아 쓴다. */
  label?: string;
}

/**
 * 바인더 순서 그대로 카드 목록을 만든다(휴지통 제외).
 * 폴더도 카드로 낸다 — 부(部)·장(章) 단위 흐름을 보드에서 함께 보기 위해서다.
 */
export function buildCards(docs: readonly DocumentNode[], rootId: string | null = null): CardItem[] {
  const active = selectActiveDocuments(docs);
  // 폴더 범위: 그 폴더의 자손만(폴더 자신은 제외), 깊이는 폴더 기준으로 다시 센다.
  const scoped = rootId ? scopeToFolder(active, rootId) : flattenTree(active);
  return scoped.map(({ node, depth }) => {
    const measure =
      node.type === "DOC" ? measureText(extractPlainText(node.content)) : ZERO_MEASURE;
    return {
      id: node.id,
      title: node.title,
      type: node.type,
      depth,
      synopsis: node.synopsis?.trim() ?? "",
      measure,
      status: normalizeStatus(node.status),
      label: node.label,
    };
  });
}

// 폴더 하나의 자손만 평탄화(폴더 자신 제외). 폴더가 아니거나 없으면 빈 배열.
function scopeToFolder(active: readonly DocumentNode[], rootId: string) {
  const root = active.find((d) => d.id === rootId);
  if (!root || root.type !== "FOLDER") return [];
  const rootDepth = flattenTree(active).find((f) => f.node.id === rootId)?.depth ?? 0;
  const ids = new Set(collectSubtreeIds(active, rootId));
  return flattenTree(active)
    .filter((f) => ids.has(f.node.id) && f.node.id !== rootId)
    .map((f) => ({ node: f.node, depth: f.depth - rootDepth - 1 }));
}

/** 라벨 필터 — 특정 라벨 id / "none"(라벨 없는 문서) / null(전체). 필터 중엔 폴더 카드를 뺀다. */
export type CardLabelFilter = string | "none" | null;

export function filterCardsByLabel(cards: readonly CardItem[], filter: CardLabelFilter): CardItem[] {
  if (filter === null) return [...cards];
  return cards.filter(
    (c) => c.type === "DOC" && (filter === "none" ? !c.label : c.label === filter),
  );
}

export interface CardSummary {
  total: number;
  withSynopsis: number;
  draft: number;
  revise: number;
  done: number;
}

export function summarizeCards(cards: readonly CardItem[]): CardSummary {
  const docs = cards.filter((c) => c.type === "DOC");
  return {
    total: docs.length,
    withSynopsis: docs.filter((c) => c.synopsis).length,
    draft: docs.filter((c) => c.status === "draft").length,
    revise: docs.filter((c) => c.status === "revise").length,
    done: docs.filter((c) => c.status === "done").length,
  };
}
