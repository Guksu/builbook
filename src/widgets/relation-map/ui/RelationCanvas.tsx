"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@shared/ui";
import type { NodePosition } from "@entities/project";
import { relationTypeColor, type Relation } from "@entities/relation";
import {
  NODE_H,
  NODE_W,
  canvasSize,
  clampPosition,
  edgeGeometry,
  hitNode,
  needsLeader,
  nodeCenter,
  pillSize,
  placeLabels,
  toBoxes,
  type LabelItem,
  type Layout,
  type Rect,
} from "@features/relation-map";
import { EDGE_TEXT_CLASS, NODE_FILL_CLASS } from "../lib/colors";

export interface CanvasNode {
  id: string;
  name: string;
  /** 인물 카드의 라벨 색 키(없으면 null). */
  color: string | null;
}

export interface RelationCanvasProps {
  nodes: readonly CanvasNode[];
  relations: readonly Relation[];
  layout: Layout;
  /** 시점 보기에서 관계 id → 그 회차까지의 마지막 변화 한 줄. */
  changeNoteOf?: ReadonlyMap<string, string>;
  /** 작품에서 고른 종류별 색(종류 → 라벨 색 이름). */
  typeColors?: Readonly<Record<string, string>> | null;
  /** 드래그를 놓았을 때 한 번(저장은 호출부가). */
  onMoveNode: (id: string, pos: NodePosition) => void;
  /** 노드에서 노드로 끌어 놓았을 때. */
  onConnect: (fromId: string, toId: string) => void;
  onEditRelation: (relation: Relation) => void;
  onOpenNode: (id: string) => void;
}

type Drag =
  | { kind: "move"; id: string; dx: number; dy: number; moved: boolean }
  | { kind: "connect"; fromId: string; x: number; y: number; overId: string | null }
  | null;

const HANDLE_R = 7;
/** 손잡이의 실제 누르는 영역 — 보이는 원보다 넓게(손가락 크기, 약 40px). */
const HANDLE_HIT_R = 20;

/**
 * SVG 관계도 캔버스 — 노드를 끌어 옮기고, 오른쪽 손잡이에서 다른 노드로 끌어 선을 만든다.
 * 라이브러리 없이 포인터 이벤트만 쓴다(번들 0 추가, 좌표 변환은 SVG 기준 1:1).
 */
export const RelationCanvas = forwardRef<SVGSVGElement, RelationCanvasProps>(function RelationCanvas(
  {
    nodes,
    relations,
    layout: savedLayout,
    changeNoteOf,
    typeColors,
    onMoveNode,
    onConnect,
    onEditRelation,
    onOpenNode,
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => svgRef.current as SVGSVGElement);
  // 드래그 중에는 로컬 배치를 움직이고, 놓을 때만 저장한다(저장은 DB 왕복이라 매 픽셀 하면 느리다).
  const [layout, setLayout] = useState<Layout>(savedLayout);
  useEffect(() => setLayout(savedLayout), [savedLayout]);
  const [drag, setDrag] = useState<Drag>(null);
  const dragRef = useRef<Drag>(null);
  dragRef.current = drag;

  const nameOf = new Map(nodes.map((n) => [n.id, n.name]));
  // 노드 상자 — 폭은 이름 길이에 따라 다르다(저장 좌표는 왼쪽 위 기준이라 그대로).
  const boxes = toBoxes(layout, (id) => nameOf.get(id) ?? "");
  const size = canvasSize(boxes);

  // 선 기하를 먼저 다 구한 뒤, 라벨 자리를 한꺼번에 정한다(겹침 회피는 전체를 봐야 한다).
  const edges = relations.flatMap((r) => {
    const a = boxes[r.fromId];
    const b = boxes[r.toId];
    if (!a || !b) return [];
    return [{ r, g: edgeGeometry(a, b), change: changeNoteOf?.get(r.id) ?? null }];
  });
  const labelItems: LabelItem[] = [];
  for (const { r, g, change } of edges) {
    const tangent = { x: g.normal.y, y: -g.normal.x };
    const push = (id: string, anchor: NodePosition, text: string) => {
      const { w, h } = pillSize(text);
      labelItems.push({ id, anchor, normal: g.normal, tangent, w, h });
    };
    push(`${r.id}:type`, g.mid, r.type);
    if (change) push(`${r.id}:change`, g.changeSlot, change);
    if (r.fromLabel) push(`${r.id}:from`, g.nearA, r.fromLabel);
    if (r.toLabel) push(`${r.id}:to`, g.nearB, r.toLabel);
  }
  const obstacles: Rect[] = nodes
    .filter((n) => boxes[n.id])
    .map((n) => ({ x: boxes[n.id].x, y: boxes[n.id].y, w: boxes[n.id].w ?? NODE_W, h: NODE_H }));
  const labelPos = placeLabels(labelItems, obstacles);
  const at = (id: string, fallback: NodePosition) => labelPos.get(id) ?? fallback;

  function toSvg(e: { clientX: number; clientY: number }): NodePosition {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }

  function startMove(id: string, e: ReactPointerEvent<SVGGElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toSvg(e);
    const pos = layout[id];
    setDrag({ kind: "move", id, dx: p.x - pos.x, dy: p.y - pos.y, moved: false });
  }

  function startConnect(id: string, e: ReactPointerEvent<SVGCircleElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = nodeCenter(boxes[id]);
    setDrag({ kind: "connect", fromId: id, x: c.x, y: c.y, overId: null });
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const d = dragRef.current;
    if (!d) return;
    const p = toSvg(e);
    if (d.kind === "move") {
      const next = clampPosition({ x: p.x - d.dx, y: p.y - d.dy });
      setLayout((prev) => ({ ...prev, [d.id]: next }));
      if (!d.moved) setDrag({ ...d, moved: true });
    } else {
      const over = hitNode(boxes, p);
      setDrag({ ...d, x: p.x, y: p.y, overId: over && over !== d.fromId ? over : null });
    }
  }

  function onPointerUp() {
    const d = dragRef.current;
    if (!d) return;
    setDrag(null);
    if (d.kind === "move") {
      if (d.moved) onMoveNode(d.id, layout[d.id]);
    } else if (d.overId) {
      onConnect(d.fromId, d.overId);
    }
  }

  return (
    <div className="overflow-auto p-16">
      <svg
        ref={svgRef}
        role="img"
        aria-label="인물 관계도"
        width={size.width}
        height={size.height}
        className="select-none rounded-lg border border-border bg-surface"
        style={{ touchAction: "none" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        <defs>
          <marker id="rel-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="currentColor" />
          </marker>
        </defs>

        {/* 선 — 노드보다 아래에 그린다 */}
        {edges.map(({ r, g, change }) => {
          const label = `${nameOf.get(r.fromId) ?? "?"} – ${nameOf.get(r.toId) ?? "?"}: ${r.type}`;
          const colorClass = EDGE_TEXT_CLASS[relationTypeColor(r.type, typeColors)] ?? EDGE_TEXT_CLASS.gray;
          const typeAt = at(`${r.id}:type`, g.mid);
          const changeAtPos = at(`${r.id}:change`, g.changeSlot);
          const fromAt = at(`${r.id}:from`, g.nearA);
          const toAt = at(`${r.id}:to`, g.nearB);
          return (
            <g
              key={r.id}
              role="button"
              tabIndex={0}
              aria-label={`관계 ${label}`}
              className={cn("cursor-pointer hover:text-primary focus:outline-none focus-visible:text-primary", colorClass)}
              onClick={() => onEditRelation(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onEditRelation(r);
                }
              }}
            >
              <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="transparent" strokeWidth={14} />
              <line
                x1={g.x1}
                y1={g.y1}
                x2={g.x2}
                y2={g.y2}
                stroke="currentColor"
                strokeWidth={2}
                markerEnd={r.fromLabel ? "url(#rel-arrow)" : undefined}
                markerStart={r.toLabel ? "url(#rel-arrow)" : undefined}
              />
              {/* 밀려난 라벨은 원래 자리(선 위)와 점선으로 잇는다 — 어느 선의 라벨인지 잃지 않게 */}
              <Leader from={g.mid} to={typeAt} />
              {change && <Leader from={g.changeSlot} to={changeAtPos} />}
              {r.fromLabel && <Leader from={g.nearA} to={fromAt} />}
              {r.toLabel && <Leader from={g.nearB} to={toAt} />}
              <Pill x={typeAt.x} y={typeAt.y} text={r.type} strong />
              {change && <Pill x={changeAtPos.x} y={changeAtPos.y} text={change} accent />}
              {r.fromLabel && <Pill x={fromAt.x} y={fromAt.y} text={r.fromLabel} />}
              {r.toLabel && <Pill x={toAt.x} y={toAt.y} text={r.toLabel} />}
            </g>
          );
        })}

        {/* 연결 중인 임시 선 */}
        {drag?.kind === "connect" && (
          <line
            x1={nodeCenter(boxes[drag.fromId]).x}
            y1={nodeCenter(boxes[drag.fromId]).y}
            x2={drag.x}
            y2={drag.y}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="pointer-events-none text-primary"
          />
        )}

        {/* 노드 */}
        {nodes.map((n) => {
          const pos = boxes[n.id];
          if (!pos) return null;
          const w = pos.w ?? NODE_W;
          const active = drag?.kind === "connect" && drag.overId === n.id;
          const dragging = drag?.kind === "move" && drag.id === n.id;
          return (
            <g
              key={n.id}
              role="button"
              tabIndex={0}
              aria-label={`인물 ${n.name}`}
              data-node-id={n.id}
              transform={`translate(${pos.x} ${pos.y})`}
              className={cn("cursor-grab", dragging && "cursor-grabbing")}
              onPointerDown={(e) => startMove(n.id, e)}
              onDoubleClick={() => onOpenNode(n.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onOpenNode(n.id);
              }}
            >
              <rect
                width={w}
                height={NODE_H}
                rx={10}
                data-node-width={w}
                className={cn(
                  "fill-bg stroke-border",
                  active && "stroke-primary",
                  dragging && "stroke-primary",
                )}
                strokeWidth={active ? 2 : 1.5}
              />
              {/* 라벨 색 띠 — 인물 카드에 라벨이 있으면 왼쪽에 */}
              {n.color && (
                <rect
                  x={6}
                  y={10}
                  width={5}
                  height={NODE_H - 20}
                  rx={2.5}
                  className={NODE_FILL_CLASS[n.color] ?? NODE_FILL_CLASS.gray}
                  data-label-color={n.color}
                />
              )}
              <text
                x={w / 2 - 6}
                y={NODE_H / 2}
                dominantBaseline="middle"
                textAnchor="middle"
                className="fill-fg text-body-sm font-medium"
              >
                {n.name.length > 13 ? `${n.name.slice(0, 12)}…` : n.name}
              </text>
              <circle
                cx={w}
                cy={NODE_H / 2}
                r={HANDLE_R}
                className="pointer-events-none fill-surface stroke-border"
                strokeWidth={1.5}
              />
              {/* 보이는 원보다 넓은 투명한 누르기 영역 — 손가락으로도 잡힌다 */}
              <circle
                cx={w}
                cy={NODE_H / 2}
                r={HANDLE_HIT_R}
                role="button"
                aria-label={`${n.name}에서 관계 잇기`}
                className="cursor-crosshair fill-transparent hover:fill-primary-weak"
                fillOpacity={0.6}
                onPointerDown={(e) => startConnect(n.id, e)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
});

/** 밀려난 라벨의 안내선 — 처음 자리와 라벨 중심 사이. 안 밀렸으면 아무것도 안 그린다. */
function Leader({ from, to }: { from: NodePosition; to: NodePosition }) {
  if (!needsLeader(from, to)) return null;
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="currentColor"
      strokeWidth={1}
      strokeDasharray="2 3"
      opacity={0.7}
      data-leader
    />
  );
}

/** 선 위의 작은 라벨 — 글자 수로 너비를 어림한다(측정 없이). */
function Pill({ x, y, text, strong, accent }: { x: number; y: number; text: string; strong?: boolean; accent?: boolean }) {
  const { w, h, text: t } = pillSize(text);
  return (
    <g transform={`translate(${x - w / 2} ${y - h / 2})`}>
      <rect
        width={w}
        height={h}
        rx={10}
        className={cn(
          accent ? "fill-primary-weak stroke-primary" : "fill-surface",
          !accent && (strong ? "stroke-current" : "stroke-border"),
        )}
        strokeWidth={1}
      />
      <text
        x={w / 2}
        y={h / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        className={cn("text-caption", strong ? "fill-fg font-medium" : accent ? "fill-primary" : "fill-fg-weak")}
      >
        {t}
      </text>
    </g>
  );
}
