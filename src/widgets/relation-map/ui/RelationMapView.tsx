"use client";

import { useMemo, useRef, useState } from "react";
import { Button, cn, usePersistedState, useToast } from "@shared/ui";
import { isOneOf } from "@shared/lib";
import type { DocumentNode } from "@entities/document";
import { findLabel, withDefaultLabels, type NodePosition, type ProjectLabel } from "@entities/project";
import {
  changeAt,
  findRelationBetween,
  liveRelations,
  useRelations,
  type Relation,
  type RelationInput,
} from "@entities/relation";
import { sortEvents, useStoryEvents } from "@entities/story-event";
import {
  circleLayout,
  downloadBlob,
  episodeDocs,
  episodeOrder,
  pngFileName,
  resolveLayout,
  svgToPngBlob,
  type Layout,
} from "@features/relation-map";
import { RelationCanvas } from "./RelationCanvas";
import { RelationForm } from "./RelationForm";
import { RelationTable } from "./RelationTable";

export interface RelationMapViewProps {
  projectId: string;
  projectTitle: string;
  documents: readonly DocumentNode[];
  labels?: ProjectLabel[];
  /** 작품에서 고른 종류별 색. */
  typeColors?: Record<string, string>;
  onSaveTypeColor: (type: string, color: string | null) => void | Promise<void>;
  savedLayout: Layout | undefined;
  onSaveLayout: (layout: Layout) => void | Promise<void>;
  onOpenDocument: (id: string) => void;
  /** 인물 카드가 없을 때 첫 카드를 만든다. */
  onCreateCharacter: () => void | Promise<void>;
}

type FormState = { fromId: string; toId: string; existing: Relation | null } | null;
type ViewKind = "map" | "list";
const isViewKind = isOneOf(["map", "list"] as const);

/**
 * 인물 관계도 — 바인더의 인물 카드가 노드, 관계선은 relations 스토어.
 * 배치는 작품(Project.relationLayout)에 저장한다. 도표/목록 전환, 회차 시점 보기.
 */
export function RelationMapView({
  projectId,
  projectTitle,
  documents,
  labels,
  typeColors,
  onSaveTypeColor,
  savedLayout,
  onSaveLayout,
  onOpenDocument,
  onCreateCharacter,
}: RelationMapViewProps) {
  const { toast } = useToast();
  const { relations, isLoading, createRelation, updateRelation, deleteRelation } = useRelations(projectId);
  const { events } = useStoryEvents(projectId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [exporting, setExporting] = useState(false);
  const characters = useMemo(
    () => documents.filter((d) => d.type === "DOC" && d.kind === "character"),
    [documents],
  );
  const ids = useMemo(() => characters.map((c) => c.id), [characters]);
  const layout = useMemo(() => resolveLayout(ids, savedLayout), [ids, savedLayout]);
  const visible = useMemo(() => liveRelations(relations, new Set(ids)), [relations, ids]);
  const episodes = useMemo(() => episodeDocs(documents), [documents]);
  const orderOf = useMemo(() => episodeOrder(documents), [documents]);
  const [form, setForm] = useState<FormState>(null);
  const [view, setView] = usePersistedState<ViewKind>(`builbook:relation-view:${projectId}`, "map", isViewKind);
  // 시점 — null이면 최신. 회차를 고르면 그 회차까지의 마지막 변화를 선에 표시한다.
  const [pointDocId, setPointDocId] = useState<string | null>(null);
  const nameOf = (id: string) => characters.find((c) => c.id === id)?.title ?? "?";
  const episodeTitleOf = (id: string) => episodes.find((e) => e.id === id)?.title ?? null;

  const changeNoteOf = useMemo(() => {
    const out = new Map<string, string>();
    for (const r of visible) {
      const c = changeAt(r, orderOf, pointDocId);
      if (c) out.set(r.id, c.note);
    }
    return out;
  }, [visible, orderOf, pointDocId]);

  // 라벨 목록이 저장된 적 없는 작품은 기본 라벨을 쓴다(바인더·코르크보드와 같은 규칙).
  const nodes = useMemo(() => {
    const labelList = withDefaultLabels(labels);
    return characters.map((c) => ({
      id: c.id,
      name: c.title,
      color: findLabel(labelList, c.label)?.color ?? null,
    }));
  }, [characters, labels]);

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

  const changeCount = visible.reduce((n, r) => n + (r.changes?.length ?? 0), 0);
  // 연표 사건 중 회차에 연결된 것 — "시점"으로 고를 수 있다(그 회차 기준).
  const eventPoints = useMemo(
    () =>
      sortEvents(events)
        .filter((e) => e.documentId && orderOf.has(e.documentId))
        .map((e) => ({ id: e.id, title: e.title, documentId: e.documentId as string })),
    [events, orderOf],
  );

  async function exportPng() {
    const svg = svgRef.current;
    if (!svg || exporting) return;
    setExporting(true);
    try {
      const blob = await svgToPngBlob(svg, 2);
      downloadBlob(blob, pngFileName(projectTitle));
      toast("관계도 이미지를 내려받았어요.", "success");
    } catch {
      toast("이미지를 만들지 못했어요.", "error");
    } finally {
      setExporting(false);
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
        <div role="group" aria-label="관계도 보기" className="flex rounded-md bg-surface p-2">
          {(["map", "list"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={view === k}
              onClick={() => setView(k)}
              className={cn(
                "rounded-sm px-8 py-2 text-caption",
                view === k ? "bg-bg font-medium text-fg shadow-sm" : "text-fg-weak hover:text-fg",
              )}
            >
              {k === "map" ? "도표" : "목록"}
            </button>
          ))}
        </div>
        {view === "map" && changeCount > 0 && (
          <>
            <label htmlFor="relation-point" className="text-caption text-fg-weak">
              시점
            </label>
            <select
              id="relation-point"
              value={pointDocId ?? ""}
              onChange={(e) => setPointDocId(e.target.value || null)}
              className="h-28 rounded-md border border-border bg-bg px-8 text-caption text-fg"
            >
              <option value="">최신</option>
              <optgroup label="회차">
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.title}까지
                  </option>
                ))}
              </optgroup>
              {eventPoints.length > 0 && (
                <optgroup label="연표 사건 (연결된 회차 기준)">
                  {eventPoints.map((ev) => (
                    <option key={ev.id} value={ev.documentId}>
                      {ev.title} · {episodeTitleOf(ev.documentId)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </>
        )}
        <span className="text-caption text-fg-weak max-lg:hidden">
          {view === "map"
            ? "인물을 끌어 배치하고, 오른쪽 동그라미에서 다른 인물로 끌면 관계가 생겨요. 두 번 누르면 카드가 열려요."
            : "줄을 누르면 관계를 고쳐요."}
        </span>
        {view === "map" && (
          <div className="ml-auto flex gap-4">
            <Button
              size="sm"
              variant="ghost"
              disabled={characters.length === 0 || exporting}
              onClick={() => void exportPng()}
            >
              {exporting ? "만드는 중…" : "이미지 저장"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={characters.length === 0}
              onClick={() => void onSaveLayout(circleLayout(ids))}
            >
              자동 배치
            </Button>
          </div>
        )}
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
      ) : view === "list" ? (
        <RelationTable
          relations={visible}
          nameOf={nameOf}
          episodeTitleOf={episodeTitleOf}
          orderOf={orderOf}
          typeColors={typeColors}
          onEdit={(r) => setForm({ fromId: r.fromId, toId: r.toId, existing: r })}
        />
      ) : (
        <RelationCanvas
          ref={svgRef}
          typeColors={typeColors}
          nodes={nodes}
          relations={visible}
          layout={layout}
          changeNoteOf={changeNoteOf}
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
          episodes={episodes}
          typeColors={typeColors}
          onSaveTypeColor={onSaveTypeColor}
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
