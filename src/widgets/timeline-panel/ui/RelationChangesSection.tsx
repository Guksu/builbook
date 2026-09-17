"use client";

import { useMemo } from "react";
import type { DocumentNode } from "@entities/document";
import { sortChanges, useRelations } from "@entities/relation";
import { episodeDocs, episodeOrder } from "@features/relation-map";

interface RelationChangesSectionProps {
  projectId: string;
  documents: readonly DocumentNode[];
  onOpenDocument?: (id: string) => void;
}

/**
 * 연표 아래 "관계 변화" — 관계도에서 회차에 붙인 변화를 회차 순으로 나열한다.
 * 사건(연표)과 관계 변화를 나란히 보며 앞뒤가 맞는지 확인하는 용도. 변화가 없으면 아무것도 그리지 않는다.
 */
export function RelationChangesSection({ projectId, documents, onOpenDocument }: RelationChangesSectionProps) {
  const { relations } = useRelations(projectId);
  const orderOf = useMemo(() => episodeOrder(documents), [documents]);
  const titleOf = (id: string) => documents.find((d) => d.id === id)?.title ?? "?";

  const rows = useMemo(() => {
    const episodes = episodeDocs(documents);
    const all = relations.flatMap((r) =>
      (r.changes ?? []).map((c) => ({
        key: `${r.id}:${c.documentId}:${c.note}`,
        documentId: c.documentId,
        note: c.note,
        pair: `${titleOf(r.fromId)} – ${titleOf(r.toId)}`,
      })),
    );
    const sorted = sortChanges(all, orderOf);
    return sorted.map((c) => ({
      ...c,
      episodeTitle: episodes.find((e) => e.id === c.documentId)?.title ?? null,
    }));
    // titleOf는 documents에서 파생 — documents만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relations, documents, orderOf]);

  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-6" aria-label="관계 변화">
      <h3 className="text-body-sm font-medium text-fg">관계 변화</h3>
      <ol className="flex flex-col gap-4">
        {rows.map((c) => (
          <li key={c.key} className="flex items-baseline gap-6 text-caption">
            {c.episodeTitle ? (
              <button
                type="button"
                className="shrink-0 rounded-sm bg-surface px-6 py-2 text-fg-weak hover:text-fg"
                onClick={() => onOpenDocument?.(c.documentId)}
              >
                {c.episodeTitle}
              </button>
            ) : (
              <span className="shrink-0 rounded-sm bg-surface px-6 py-2 text-fg-muted">지워진 회차</span>
            )}
            <span className="text-fg">{c.pair}</span>
            <span className="text-fg-weak">{c.note}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
