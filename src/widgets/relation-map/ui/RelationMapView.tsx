"use client";

import { useMemo, useState } from "react";
import { Button, useToast } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import type { NodePosition } from "@entities/project";
import {
  findRelationBetween,
  liveRelations,
  useRelations,
  type Relation,
  type RelationInput,
} from "@entities/relation";
import { circleLayout, resolveLayout, type Layout } from "@features/relation-map";
import { RelationCanvas } from "./RelationCanvas";
import { RelationForm } from "./RelationForm";

export interface RelationMapViewProps {
  projectId: string;
  documents: readonly DocumentNode[];
  savedLayout: Layout | undefined;
  onSaveLayout: (layout: Layout) => void | Promise<void>;
  onOpenDocument: (id: string) => void;
  /** 인물 카드가 없을 때 첫 카드를 만든다. */
  onCreateCharacter: () => void | Promise<void>;
}

type FormState = { fromId: string; toId: string; existing: Relation | null } | null;

/**
 * 인물 관계도 — 바인더의 인물 카드가 노드, 관계선은 relations 스토어.
 * 배치는 작품(Project.relationLayout)에 저장한다.
 */
export function RelationMapView({
  projectId,
  documents,
  savedLayout,
  onSaveLayout,
  onOpenDocument,
  onCreateCharacter,
}: RelationMapViewProps) {
  const { toast } = useToast();
  const { relations, isLoading, createRelation, updateRelation, deleteRelation } = useRelations(projectId);
  const characters = useMemo(
    () => documents.filter((d) => d.type === "DOC" && d.kind === "character"),
    [documents],
  );
  const ids = useMemo(() => characters.map((c) => c.id), [characters]);
  const layout = useMemo(() => resolveLayout(ids, savedLayout), [ids, savedLayout]);
  const visible = useMemo(() => liveRelations(relations, new Set(ids)), [relations, ids]);
  const [form, setForm] = useState<FormState>(null);
  const nameOf = (id: string) => characters.find((c) => c.id === id)?.title ?? "?";

  async function moveNode(id: string, pos: NodePosition) {
    try {
      await onSaveLayout({ ...layout, [id]: pos });
    } catch {
      toast("배치를 저장하지 못했어요.", "error");
    }
  }

  function connect(fromId: string, toId: string) {
    const existing = findRelationBetween(relations, fromId, toId) ?? null;
    // 이미 있는 관계면 그 방향(from/to) 그대로 고친다.
    setForm(existing ? { fromId: existing.fromId, toId: existing.toId, existing } : { fromId, toId, existing: null });
  }

  async function submit(input: RelationInput) {
    if (!form) return;
    try {
      if (form.existing) await updateRelation(form.existing.id, input);
      else await createRelation(form.fromId, form.toId, input);
    } catch {
      toast("관계를 저장하지 못했어요.", "error");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-8 border-b border-border px-24 py-8 text-body-sm">
        <span className="font-medium text-fg">인물 관계도</span>
        <span className="text-fg-weak" aria-label="관계도 요약">
          인물 {characters.length}명 · 관계 {visible.length}개
        </span>
        <span className="mx-4 h-16 w-px bg-border" aria-hidden />
        <span className="text-caption text-fg-weak">
          인물을 끌어 배치하고, 오른쪽 동그라미에서 다른 인물로 끌면 관계가 생겨요. 인물을 두 번 누르면 카드가 열려요.
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          disabled={characters.length === 0}
          onClick={() => void onSaveLayout(circleLayout(ids))}
        >
          자동 배치
        </Button>
      </div>

      {characters.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-12 p-24 text-center">
          <p className="text-body text-fg">아직 인물 카드가 없어요.</p>
          <p className="text-body-sm text-fg-weak">인물 카드를 만들면 여기 노드로 나타나요. 바인더의 카드 템플릿에서도 만들 수 있어요.</p>
          <Button variant="secondary" onClick={() => void onCreateCharacter()}>
            첫 인물 카드 만들기
          </Button>
        </div>
      ) : isLoading ? (
        <p className="p-24 text-body-sm text-fg-weak">불러오는 중…</p>
      ) : (
        <RelationCanvas
          nodes={characters.map((c) => ({ id: c.id, name: c.title }))}
          relations={visible}
          layout={layout}
          onMoveNode={(id, pos) => void moveNode(id, pos)}
          onConnect={connect}
          onEditRelation={(r) => setForm({ fromId: r.fromId, toId: r.toId, existing: r })}
          onOpenNode={onOpenDocument}
        />
      )}

      {form && (
        <RelationForm
          key={form.existing?.id ?? `${form.fromId}-${form.toId}`}
          open
          onClose={() => setForm(null)}
          fromName={nameOf(form.fromId)}
          toName={nameOf(form.toId)}
          existing={form.existing}
          onSubmit={submit}
          onDelete={
            form.existing
              ? async () => {
                  try {
                    await deleteRelation(form.existing!.id);
                  } catch {
                    toast("관계를 지우지 못했어요.", "error");
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
