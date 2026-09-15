"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConfirmModal,
  ContextMenu,
  cn,
  type ContextMenuItem,
} from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { nextEpisodeTitle, nextFolderTitle } from "@entities/document";
import {
  BINDER_SORTS,
  BINDER_SORT_LABEL,
  collectFolderIds,
  flattenVisible,
  useCollapsedFolders,
  type BinderSort,
} from "@features/binder-tree";
import {
  ChevronIcon,
  CollapseAllIcon,
  ExpandAllIcon,
  FilePlusIcon,
  FolderPlusIcon,
  MoreIcon,
  SortIcon,
} from "./icons";

/*
  바인더 — 옵시디언 파일 탐색기를 본뜬 문서 트리.
  진입장벽을 낮추는 쪽으로 몰아간 선택들:
  - 새 문서는 다이얼로그 없이 "N화"로 즉시 만들고, 그 자리에서 이름만 고친다.
  - 평소엔 이름만 보이고, 나머지 동작(이름 변경·삭제·하위 생성)은 우클릭/… 메뉴 뒤로 숨긴다.
  - 정렬·접힘은 취향이라 바꿀 수 있게 두되 기본값(바인더 순서, 다 펼침)으로 아무 설정 없이 쓴다.
*/

interface BinderProps {
  documents: DocumentNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** 생성된 문서를 돌려줘야 한다 — 그 항목을 바로 인라인 이름 편집으로 열기 때문. */
  onCreate: (input: {
    title: string;
    type: "FOLDER" | "DOC";
    parentId: string | null;
  }) => Promise<DocumentNode | null>;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  // 드래그 재정렬: 폴더 위 드롭=into(안으로), 문서 위 드롭=before(앞에).
  onMove?: (dragId: string, targetId: string, mode: "into" | "before") => void;
  /** 접힘 상태를 저장할 작품 id(localStorage 키). */
  projectId?: string;
}

type MenuState =
  | { kind: "node"; x: number; y: number; node: DocumentNode }
  | { kind: "empty"; x: number; y: number }
  | { kind: "sort"; x: number; y: number }
  | null;

const INDENT = 12; // 들여쓰기 한 단계(px) — 가이드 선 간격과 같다.

export function Binder({
  documents,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onMove,
  projectId = "",
}: BinderProps) {
  const { collapsed, toggle, expand, collapseAll, expandAll } =
    useCollapsedFolders(projectId);
  const [sort, setSort] = useState<BinderSort>("order");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentNode | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    mode: "into" | "before";
  } | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const rows = useMemo(
    () => flattenVisible(documents, collapsed, sort),
    [documents, collapsed, sort],
  );
  const folderIds = useMemo(() => collectFolderIds(documents), [documents]);
  // 접을 폴더가 하나라도 남아 있으면 "모두 접기", 전부 접혀 있으면 "모두 펼치기".
  const allCollapsed =
    folderIds.length > 0 && folderIds.every((fid) => collapsed.has(fid));

  // 키보드 커서는 바인더 안에서만 쓰는 상태 — 사라진 항목을 가리키면 현재 문서로 돌려놓는다.
  const cursorId =
    activeId && rows.some((r) => r.node.id === activeId) ? activeId : selectedId;

  useEffect(() => {
    if (editingId && !documents.some((d) => d.id === editingId)) setEditingId(null);
  }, [documents, editingId]);

  const focusRow = useCallback((id: string) => {
    setActiveId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  // 새 항목의 부모 결정 — 옵시디언과 같다: 폴더를 고르고 있으면 그 안, 문서면 그 문서의 형제.
  const parentForAnchor = useCallback(
    (anchorId: string | null) => {
      const anchor = anchorId ? documents.find((d) => d.id === anchorId) : null;
      if (!anchor) return null;
      return anchor.type === "FOLDER" ? anchor.id : anchor.parentId;
    },
    [documents],
  );

  const create = useCallback(
    async (type: "FOLDER" | "DOC", anchorId: string | null) => {
      const parentId = parentForAnchor(anchorId);
      const siblings = documents.filter((d) => d.parentId === parentId);
      const title =
        type === "DOC" ? nextEpisodeTitle(siblings) : nextFolderTitle(siblings);
      if (parentId) expand(parentId); // 접힌 폴더 안에 만들면 안 보이니 펼쳐 준다
      const created = await onCreate({ title, type, parentId });
      if (created) {
        setActiveId(created.id);
        setEditingId(created.id); // 기본 이름이 선택된 채로 바로 고쳐 쓸 수 있게
      }
    },
    [documents, expand, onCreate, parentForAnchor],
  );

  const commitRename = useCallback(
    (node: DocumentNode, value: string) => {
      setEditingId(null);
      const next = value.trim();
      // 빈 값이면 방금 붙인 기본 이름("3화" 등)을 그대로 둔다 — 이름 없는 문서는 만들지 않는다.
      if (next && next !== node.title) onRename(node.id, next);
    },
    [onRename],
  );

  const nodeMenuItems = useCallback(
    (node: DocumentNode): ContextMenuItem[] => [
      { label: "새 문서", onSelect: () => void create("DOC", node.id) },
      { label: "새 폴더", onSelect: () => void create("FOLDER", node.id) },
      { label: "이름 변경", onSelect: () => setEditingId(node.id) },
      { label: "삭제", danger: true, onSelect: () => setDeleteTarget(node) },
    ],
    [create],
  );

  const openNodeMenu = (node: DocumentNode, x: number, y: number) => {
    setActiveId(node.id);
    setMenu({ kind: "node", x, y, node });
  };

  function handleTreeKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (editingId) return;
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const idx = rows.findIndex((r) => r.node.id === cursorId);
    const row = idx >= 0 ? rows[idx] : null;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = rows[Math.min(idx + 1, rows.length - 1)] ?? rows[0];
      if (next) focusRow(next.node.id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = rows[Math.max(idx - 1, 0)] ?? rows[0];
      if (prev) focusRow(prev.node.id);
    } else if (e.key === "ArrowRight") {
      if (!row) return;
      e.preventDefault();
      if (row.node.type === "FOLDER" && !row.expanded) expand(row.node.id);
      else if (row.expanded && rows[idx + 1]) focusRow(rows[idx + 1].node.id);
    } else if (e.key === "ArrowLeft") {
      if (!row) return;
      e.preventDefault();
      if (row.node.type === "FOLDER" && row.expanded) toggle(row.node.id);
      else if (row.node.parentId) focusRow(row.node.parentId);
    } else if (e.key === "Enter") {
      if (!row) return;
      e.preventDefault();
      if (row.node.type === "DOC") onSelect(row.node.id);
      else toggle(row.node.id);
    } else if (e.key === "F2") {
      if (!row) return;
      e.preventDefault();
      // 에디터가 window에서 F2(제목 편집)를 듣고 있다 — 바인더에서 누른 F2까지 가로채
      // 본문 제목칸으로 포커스가 튀지 않게 여기서 끊는다.
      e.stopPropagation();
      setEditingId(row.node.id);
    }
  }

  return (
    <nav className="flex h-full flex-col border-r border-border bg-bg">
      {/* 상단 아이콘 줄 — 이름은 title/aria-label로만 두고 화면은 조용하게 */}
      <div className="flex items-center justify-between gap-6 border-b border-border px-12 py-8">
        <span className="text-caption font-medium text-fg-weak">바인더</span>
        <div className="flex items-center gap-2">
          <IconButton
            label="새 문서"
            onClick={() => void create("DOC", cursorId)}
          >
            <FilePlusIcon />
          </IconButton>
          <IconButton
            label="새 폴더"
            onClick={() => void create("FOLDER", cursorId)}
          >
            <FolderPlusIcon />
          </IconButton>
          <IconButton
            label="정렬"
            hasPopup
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenu({ kind: "sort", x: r.left, y: r.bottom + 4 });
            }}
          >
            <SortIcon />
          </IconButton>
          <IconButton
            label={allCollapsed ? "모두 펼치기" : "모두 접기"}
            onClick={() => (allCollapsed ? expandAll() : collapseAll(folderIds))}
          >
            {allCollapsed ? <ExpandAllIcon /> : <CollapseAllIcon />}
          </IconButton>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto py-4"
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ kind: "empty", x: e.clientX, y: e.clientY });
        }}
      >
        {documents.length === 0 ? (
          <p className="px-16 py-24 text-center text-body-sm text-fg-weak">
            새 문서 아이콘을 눌러 시작하세요.
          </p>
        ) : (
          <div
            role="tree"
            aria-label="문서 트리"
            onKeyDown={handleTreeKeyDown}
            className="flex flex-col"
          >
            {rows.map(({ node, depth, hasChildren, expanded }) => {
              const isFolder = node.type === "FOLDER";
              const editing = editingId === node.id;
              return (
                <div
                  key={node.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(node.id, el);
                    else rowRefs.current.delete(node.id);
                  }}
                  role="treeitem"
                  aria-label={node.title}
                  aria-level={depth + 1}
                  aria-selected={selectedId === node.id}
                  aria-expanded={isFolder ? expanded : undefined}
                  tabIndex={cursorId === node.id ? 0 : -1}
                  draggable={!editing}
                  onFocus={() => setActiveId(node.id)}
                  onClick={() => {
                    if (editing) return;
                    setActiveId(node.id);
                    if (isFolder) toggle(node.id);
                    else onSelect(node.id);
                  }}
                  onDoubleClick={() => setEditingId(node.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openNodeMenu(node, e.clientX, e.clientY);
                  }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", node.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(node.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDropTarget(null);
                  }}
                  onDragOver={(e) => {
                    if (!dragId || dragId === node.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropTarget({ id: node.id, mode: isFolder ? "into" : "before" });
                  }}
                  onDragLeave={() =>
                    setDropTarget((t) => (t?.id === node.id ? null : t))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragged = e.dataTransfer.getData("text/plain") || dragId;
                    if (dragged && dragged !== node.id) {
                      onMove?.(dragged, node.id, isFolder ? "into" : "before");
                    }
                    setDropTarget(null);
                    setDragId(null);
                  }}
                  className={cn(
                    "group relative flex cursor-pointer select-none items-stretch",
                    "border-t-2 border-transparent text-body-sm outline-none",
                    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    selectedId === node.id
                      ? "bg-primary-weak text-primary"
                      : "text-fg hover:bg-surface",
                    dragId === node.id && "opacity-50",
                    dropTarget?.id === node.id &&
                      (dropTarget.mode === "into"
                        ? "ring-2 ring-inset ring-primary"
                        : "border-t-primary"),
                  )}
                >
                  {/* 들여쓰기 가이드 — 어느 폴더에 속한 줄인지 얇은 세로선으로만 알린다 */}
                  {Array.from({ length: depth }, (_, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="ml-8 shrink-0 border-l border-border"
                      style={{ width: INDENT }}
                    />
                  ))}

                  <div className="flex min-w-0 flex-1 items-center gap-2 py-4 pl-8 pr-4">
                    {isFolder ? (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`${node.title} ${expanded ? "접기" : "펼치기"}`}
                        className={cn(
                          "shrink-0 rounded-sm p-2 text-fg-muted hover:text-fg",
                          !hasChildren && "opacity-40",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveId(node.id);
                          toggle(node.id);
                        }}
                      >
                        <ChevronIcon expanded={expanded} />
                      </button>
                    ) : (
                      // 문서엔 아이콘을 두지 않는다(옵시디언과 동일) — chevron 자리만 비워 정렬을 맞춘다.
                      <span aria-hidden className="w-16 shrink-0" />
                    )}

                    {editing ? (
                      <NameInput
                        initial={node.title}
                        onCommit={(v) => commitRename(node, v)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate" title={node.title}>
                        {node.title}
                      </span>
                    )}

                    {!editing && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`${node.title} 메뉴`}
                        title="메뉴"
                        className="shrink-0 rounded-sm p-2 text-fg-weak opacity-0 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          const r = e.currentTarget.getBoundingClientRect();
                          openNodeMenu(node, r.left, r.bottom + 4);
                        }}
                      >
                        <MoreIcon />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {menu?.kind === "node" && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={`${menu.node.title} 메뉴`}
          items={nodeMenuItems(menu.node)}
          onClose={() => setMenu(null)}
        />
      )}
      {menu?.kind === "empty" && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label="바인더 메뉴"
          items={[
            { label: "새 문서", onSelect: () => void create("DOC", null) },
            { label: "새 폴더", onSelect: () => void create("FOLDER", null) },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
      {menu?.kind === "sort" && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label="정렬 기준"
          items={BINDER_SORTS.map((mode) => ({
            label: BINDER_SORT_LABEL[mode],
            checked: sort === mode,
            onSelect: () => setSort(mode),
          }))}
          onClose={() => setMenu(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={`'${deleteTarget?.title}' 삭제`}
        description={
          deleteTarget?.type === "FOLDER"
            ? "폴더와 하위 문서를 휴지통으로 보냅니다. 휴지통에서 되살릴 수 있어요."
            : "문서를 휴지통으로 보냅니다. 휴지통에서 되살릴 수 있어요."
        }
        danger
        confirmText="삭제"
      />
    </nav>
  );
}

/** 상단 줄의 작은 아이콘 버튼 — 이름은 보조기술/툴팁으로만 노출한다. */
function IconButton({
  label,
  children,
  onClick,
  hasPopup,
}: {
  label: string;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasPopup?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-haspopup={hasPopup ? "menu" : undefined}
      onClick={onClick}
      className="rounded-sm p-4 text-fg-weak hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

/**
 * 인라인 이름 편집 입력.
 * Enter/포커스 아웃=확정, Esc=취소. 한글 IME 조합 중 Enter는 '조합 확정'이라 무시한다.
 */
function NameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const cancelled = useRef(false);

  return (
    <input
      aria-label="이름"
      autoFocus
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation(); // 트리 키보드 이동(↑↓)과 섞이지 않게
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          e.currentTarget.blur(); // blur에서 한 번만 확정
        } else if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={() => (cancelled.current ? onCancel() : onCommit(value))}
      className="min-w-0 flex-1 rounded-sm border border-primary bg-bg px-4 py-1 text-body-sm text-fg outline-none"
    />
  );
}
