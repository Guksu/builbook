"use client";

import { useMemo } from "react";
import { Button, cn } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { relationTypeColor, useRelations } from "@entities/relation";
import { DOT_BG_CLASS } from "../lib/colors";

export interface CharacterRelationsSummaryProps {
  projectId: string;
  /** 지금 인스펙터에 열린 인물 카드. */
  doc: DocumentNode;
  documents: readonly DocumentNode[];
  typeColors?: Readonly<Record<string, string>> | null;
  onOpenRelations: () => void;
}

/**
 * 인스펙터 "이 인물의 관계" — 관계도를 열지 않고도 이 인물이 누구와 어떤 사이인지 본다.
 * 줄마다 상대·종류·(이 인물→상대 / 상대→이 인물) 한 줄. 편집은 관계도에서.
 */
export function CharacterRelationsSummary({ projectId, doc, documents, typeColors, onOpenRelations }: CharacterRelationsSummaryProps) {
  const { relations } = useRelations(projectId);
  const rows = useMemo(() => {
    const titleOf = (id: string) => documents.find((d) => d.id === id)?.title ?? null;
    return relations
      .filter((r) => r.fromId === doc.id || r.toId === doc.id)
      .map((r) => {
        const mine = r.fromId === doc.id;
        const otherId = mine ? r.toId : r.fromId;
        return {
          id: r.id,
          other: titleOf(otherId),
          type: r.type,
          color: relationTypeColor(r.type, typeColors),
          toOther: mine ? r.fromLabel : r.toLabel,
          fromOther: mine ? r.toLabel : r.fromLabel,
        };
      })
      .filter((r) => r.other !== null)
      .sort((a, b) => (a.other ?? "").localeCompare(b.other ?? "", "ko"));
  }, [relations, doc.id, documents, typeColors]);

  return (
    <section className="mt-16 flex flex-col gap-8 border-t border-border pt-12" aria-label="이 인물의 관계">
      <div className="flex items-center justify-between">
        <h3 className="text-body-sm font-medium text-fg">이 인물의 관계</h3>
        <Button size="sm" variant="ghost" onClick={onOpenRelations}>
          관계도 열기
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-caption text-fg-weak">아직 관계가 없어요. 관계도에서 다른 인물과 이어 보세요.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {rows.map((r) => (
            <li key={r.id} className="text-caption">
              <div className="flex items-center gap-6">
                <span aria-hidden className={cn("inline-block h-8 w-8 shrink-0 rounded-full", DOT_BG_CLASS[r.color])} />
                <span className="font-medium text-fg">{r.other}</span>
                <span className="text-fg-weak">{r.type}</span>
              </div>
              {(r.toOther || r.fromOther) && (
                <p className="ml-14 text-fg-weak">
                  {r.toOther && <span>→ {r.toOther}</span>}
                  {r.toOther && r.fromOther && <span aria-hidden> · </span>}
                  {r.fromOther && <span>← {r.fromOther}</span>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
