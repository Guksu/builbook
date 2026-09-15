"use client";

import { useEffect, useState } from "react";
import { Textarea, cn } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { LABEL_COLOR_CLASS, findLabel, withDefaultLabels, type ProjectLabel } from "@entities/project";
import { formatCount, pickCount } from "@shared/lib";
import { useCountUnit } from "@features/count-unit";
import {
  buildCards,
  filterCardsByLabel,
  docStatusLabel,
  type CardLabelFilter,
  nextStatus,
  summarizeCards,
  type CardItem,
} from "@features/corkboard";

export interface CorkboardProps {
  documents: readonly DocumentNode[];
  selectedId: string | null;
  /** 카드를 열면 에디터로 전환한다(호출부가 뷰 모드를 바꾼다). */
  onOpen: (id: string) => void;
  onUpdateSynopsis: (id: string, synopsis: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  /** 바인더와 같은 규약: 폴더 위 드롭=into, 문서 위 드롭=before. */
  onMove: (dragId: string, targetId: string, mode: "into" | "before") => void;
  /** 작품 라벨 목록 — 카드 상단 색 띠(미설정이면 기본 라벨). */
  labels?: ProjectLabel[];
  /** 폴더 범위 — 이 폴더의 자손 카드만 보인다(스크리브너처럼 폴더를 고르면 그 안만). null=전체. */
  scopeId?: string | null;
  /** 라벨 필터 — 라벨 id / "none" / null(전체). */
  labelFilter?: CardLabelFilter;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-surface text-fg-weak",
  revise: "bg-warning-weak text-warning-strong",
  done: "bg-success-weak text-success-strong",
};

/**
 * 코르크보드 — 회차를 카드로 늘어놓고 시놉시스만 보며 순서를 바꾸는 화면.
 * 본문을 열지 않고 이야기 뼈대를 만지는 게 목적이라 카드에는 요약·분량·상태만 둔다.
 */
export function Corkboard({
  documents,
  selectedId,
  onOpen,
  onUpdateSynopsis,
  onUpdateStatus,
  onMove,
  labels,
  scopeId = null,
  labelFilter = null,
}: CorkboardProps) {
  const [unit] = useCountUnit();
  const labelList = withDefaultLabels(labels);
  const cards = filterCardsByLabel(buildCards(documents, scopeId), labelFilter);
  const summary = summarizeCards(cards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // 편집 중이던 카드가 사라지면(삭제·이동) 편집 상태를 접는다.
  useEffect(() => {
    if (editing && !cards.some((c) => c.id === editing)) setEditing(null);
  }, [cards, editing]);

  function startEdit(card: CardItem) {
    setEditing(card.id);
    setDraft(card.synopsis);
  }

  function commitEdit(card: CardItem) {
    const next = draft.trim();
    if (next !== card.synopsis) onUpdateSynopsis(card.id, next);
    setEditing(null);
  }

  if (cards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 text-center text-fg-weak">
        <p className="text-body-lg">보드에 올릴 카드가 없어요.</p>
        <p className="text-body">
          바인더에서 <b className="text-fg">+ 문서</b>로 회차를 만들면 카드가 생겨요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-16 p-24">
      <p className="text-body-sm text-fg-weak">
        {summary.total}편 · 시놉시스 {summary.withSynopsis}편 · 초고 {summary.draft} / 퇴고{" "}
        {summary.revise} / 완료 {summary.done}
        <span className="ml-8 text-caption">카드를 끌어 순서를 바꿀 수 있어요.</span>
      </p>

      <ul
        aria-label="코르크보드 카드"
        className="grid grid-cols-1 gap-16 sm:grid-cols-2 xl:grid-cols-3"
      >
        {cards.map((card) => {
          const label = findLabel(labelList, card.label);
          return (
          <li key={card.id}>
            <article
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", card.id);
                e.dataTransfer.effectAllowed = "move";
                setDragId(card.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDropTarget(null);
              }}
              onDragOver={(e) => {
                if (!dragId || dragId === card.id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropTarget(card.id);
              }}
              onDragLeave={() => setDropTarget((t) => (t === card.id ? null : t))}
              onDrop={(e) => {
                e.preventDefault();
                const dragged = e.dataTransfer.getData("text/plain") || dragId;
                if (dragged && dragged !== card.id) {
                  onMove(dragged, card.id, card.type === "FOLDER" ? "into" : "before");
                }
                setDropTarget(null);
                setDragId(null);
              }}
              className={cn(
                "flex h-[200px] cursor-grab flex-col rounded-lg border bg-bg p-12 shadow-sm active:cursor-grabbing",
                card.type === "FOLDER" ? "border-border-strong bg-surface" : "border-border",
                selectedId === card.id && "ring-2 ring-primary",
                dragId === card.id && "opacity-50",
                dropTarget === card.id && "ring-2 ring-inset ring-primary",
              )}
            >
              {/* 라벨 — 색 띠 + 이름 칩. 카드 더미에서 계열을 색으로 먼저 알아보게 한다. */}
              {label && (
                <div className="mb-8 flex items-center gap-6">
                  <span
                    aria-hidden
                    className={cn(
                      "h-4 w-24 shrink-0 rounded-full",
                      LABEL_COLOR_CLASS[label.color],
                    )}
                  />
                  <span
                    className="truncate text-caption text-fg-weak"
                    title={`라벨: ${label.name}`}
                  >
                    {label.name}
                  </span>
                </div>
              )}

              <header className="mb-8 flex items-start gap-6">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-body-sm font-medium text-fg hover:text-primary"
                  onClick={() => card.type === "DOC" && onOpen(card.id)}
                  title={card.title}
                >
                  <span className="mr-4 text-fg-muted">
                    {card.type === "FOLDER" ? "📁" : "📄"}
                  </span>
                  {card.title}
                </button>
                {card.type === "DOC" && (
                  <button
                    type="button"
                    aria-label={`${card.title} 진행 상태`}
                    onClick={() => onUpdateStatus(card.id, nextStatus(card.status))}
                    className={cn(
                      "shrink-0 rounded-full px-8 py-2 text-caption",
                      STATUS_STYLE[card.status],
                    )}
                  >
                    {docStatusLabel(card.status)}
                  </button>
                )}
              </header>

              {editing === card.id ? (
                <Textarea
                  autoFocus
                  aria-label={`${card.title} 시놉시스`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitEdit(card)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="min-h-0 flex-1 text-body-sm"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(card)}
                  className="flex-1 overflow-hidden text-left text-body-sm text-fg-weak hover:text-fg"
                >
                  {card.synopsis || "요약을 적어 두면 흐름이 한눈에 보여요."}
                </button>
              )}

              <footer className="mt-8 flex justify-between text-caption tabular-nums text-fg-muted">
                <span>
                  {card.type === "DOC" ? formatCount(pickCount(card.measure, unit), unit) : "폴더"}
                </span>
              </footer>
            </article>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
