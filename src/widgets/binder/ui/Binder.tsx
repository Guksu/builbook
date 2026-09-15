"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConfirmModal,
  ContextMenu,
  cn,
  type ContextMenuItem,
} from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import {
  DOCUMENT_KINDS,
  buildTemplateContent,
  defaultTitleForKind,
  kindLabel,
  nextFolderTitle,
  type DocumentKind,
} from "@entities/document";
import {
  LABEL_COLOR_CLASS,
  findLabel,
  withDefaultLabels,
  type ProjectLabel,
} from "@entities/project";
import { docStatusLabel, normalizeStatus } from "@features/corkboard";
import {
  BINDER_SORTS,
  BINDER_SORT_LABEL,
  collectFolderIds,
  dropDescendants,
  filterTreeByLabel,
  flattenVisible,
  selectRange,
  useCollapsedFolders,
  type BinderLabelFilter,
  type BinderSort,
} from "@features/binder-tree";
import {
  ChevronIcon,
  CollapseAllIcon,
  ExpandAllIcon,
  FilePlusIcon,
  FilterIcon,
  FolderPlusIcon,
  MoreIcon,
  SortIcon,
  TemplateIcon,
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
    content?: unknown;
    kind?: DocumentKind;
  }) => Promise<DocumentNode | null>;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  /** 다중 선택 일괄 삭제 — 없으면 onDelete를 차례로 부른다. */
  onDeleteMany?: (ids: string[]) => void;
  // 드래그 재정렬: 폴더 위 드롭=into(안으로), 문서 위 드롭=before(앞에).
  onMove?: (dragId: string, targetId: string, mode: "into" | "before") => void;
  /** 지정한 부모(null=최상위)의 맨 끝으로 이동 — 메뉴 "최상위로 이동"·트리 아래 빈 공간 드롭. */
  onMoveToParent?: (id: string, parentId: string | null) => void;
  /**
   * 여러 항목을 지정한 부모의 맨 끝으로 한꺼번에 이동(다중 선택 메뉴·드래그).
   * onMoveToParent를 여러 번 부르면 호출부가 옮기기 전 목록을 기준으로 order를 계산해
   * 전부 같은 자리에 겹친다 — 그래서 '여러 개'는 반드시 이 한 번의 호출로 넘긴다.
   */
  onMoveManyToParent?: (ids: string[], parentId: string | null) => void;
  /** 접힘 상태를 저장할 작품 id(localStorage 키). */
  projectId?: string;
  /** 작품 라벨 목록 — 행 앞의 색 막대를 그린다(미설정이면 기본 라벨). */
  labels?: ProjectLabel[];
}

type MenuState =
  | { kind: "node"; x: number; y: number; node: DocumentNode }
  | { kind: "empty"; x: number; y: number }
  | { kind: "sort"; x: number; y: number }
  | { kind: "template"; x: number; y: number }
  | { kind: "filter"; x: number; y: number }
  | null;

/** 삭제 확인 대상 — 한 항목이거나 다중 선택 묶음. */
type DeleteTarget =
  | { kind: "one"; node: DocumentNode }
  | { kind: "many"; ids: string[] }
  | null;

const INDENT = 12; // 들여쓰기 한 단계(px) — 가이드 선 간격과 같다.

export function Binder({
  documents,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onDeleteMany,
  onMove,
  onMoveToParent,
  onMoveManyToParent,
  projectId = "",
  labels,
}: BinderProps) {
  const { collapsed, toggle, expand, collapseAll, expandAll } =
    useCollapsedFolders(projectId);
  const [sort, setSort] = useState<BinderSort>("order");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  /** 함께 끌고 있는 항목들(다중 선택 드래그). 평소엔 [dragId] 하나. */
  const [dragIds, setDragIds] = useState<string[]>([]);
  const [rootDrop, setRootDrop] = useState(false);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    mode: "into" | "before";
  } | null>(null);
  // 다중 선택(Ctrl/⌘·Shift 클릭)과 그 기준점. 한 번 고른 뒤 Shift로 범위를 넓히는 데 쓴다.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  // 라벨 필터는 세션 상태 — 저장하지 않는다(다음에 들어왔을 때 원고가 반쯤 사라져 보이면 사고다).
  const [labelFilter, setLabelFilter] = useState<BinderLabelFilter>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const visibleDocs = useMemo(
    () => filterTreeByLabel(documents, labelFilter),
    [documents, labelFilter],
  );
  const rows = useMemo(
    // 필터가 켜져 있으면 접힘을 무시한다 — 걸러 남긴 회차가 접힌 폴더에 숨으면 필터가 무의미하다.
    () => flattenVisible(visibleDocs, labelFilter ? new Set() : collapsed, sort),
    [visibleDocs, collapsed, sort, labelFilter],
  );
  const folderIds = useMemo(() => collectFolderIds(documents), [documents]);
  const labelList = useMemo(() => withDefaultLabels(labels), [labels]);
  const activeFilterLabel = labelFilter ? findLabel(labelList, labelFilter) : null;

  // 화면에 보이는 순서로 추린 다중 선택 — 지워졌거나 숨은 항목은 자동으로 빠진다.
  const multiIds = useMemo(
    () => rows.filter((r) => selectedIds.has(r.node.id)).map((r) => r.node.id),
    [rows, selectedIds],
  );
  const multi = multiIds.length >= 2; // 2개 이상일 때만 '묶음'으로 다룬다
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
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

  /** 묶음 동작의 실제 대상 — 조상과 자손이 같이 선택됐으면 자손은 뺀다. */
  const targetsOf = useCallback(
    (ids: string[]) => dropDescendants(documents, ids),
    [documents],
  );

  const deleteMany = useCallback(
    (ids: string[]) => {
      if (onDeleteMany) onDeleteMany(ids);
      else for (const id of ids) onDelete(id); // 일괄 삭제를 안 받는 화면은 하나씩
      clearSelection();
    },
    [clearSelection, onDelete, onDeleteMany],
  );

  const moveMany = useCallback(
    (ids: string[], parentId: string | null) => {
      if (ids.length === 0) return;
      if (onMoveManyToParent) onMoveManyToParent(ids, parentId);
      else if (onMoveToParent) for (const id of ids) onMoveToParent(id, parentId);
      clearSelection();
    },
    [clearSelection, onMoveManyToParent, onMoveToParent],
  );

  /**
   * 행 클릭 — 스크리브너 바인더와 같은 세 갈래.
   * 그냥 클릭=하나만 골라 연다 / Ctrl·⌘=하나씩 더하고 뺀다 / Shift=기준점부터 범위.
   * 기준점이 아직 없으면 '지금 열려 있는 문서'가 기준이 된다.
   */
  const handleRowClick = useCallback(
    (node: DocumentNode, e: React.MouseEvent) => {
      setActiveId(node.id);
      const anchor = anchorId ?? selectedId;
      if (e.shiftKey) {
        setSelectedIds(
          new Set(selectRange(rows.map((r) => r.node.id), anchor, node.id)),
        );
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        // 첫 Ctrl+클릭이면 열려 있는 문서까지 함께 묶는다(보이는 강조와 실제 대상이 어긋나지 않게).
        const next = new Set(
          selectedIds.size > 0 ? selectedIds : anchor ? [anchor] : [],
        );
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        setSelectedIds(next);
        setAnchorId(node.id);
        return;
      }
      clearSelection();
      setAnchorId(node.id);
      // 폴더도 '고르는' 대상이다(스크리브너와 같다) — 고르면 그 아래 회차가
      // 연속 보기로 이어 열린다. 접기/펼치기는 chevron과 ←/→ 키가 맡는다.
      onSelect(node.id);
    },
    [anchorId, clearSelection, onSelect, rows, selectedId, selectedIds],
  );

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
    async (type: "FOLDER" | "DOC", anchorId: string | null, kind: DocumentKind = "episode") => {
      const parentId = parentForAnchor(anchorId);
      const siblings = documents.filter((d) => d.parentId === parentId);
      const title =
        type === "DOC" ? defaultTitleForKind(kind, siblings) : nextFolderTitle(siblings);
      if (parentId) expand(parentId); // 접힌 폴더 안에 만들면 안 보이니 펼쳐 준다
      const created = await onCreate({
        title,
        type,
        parentId,
        ...(type === "DOC" ? { content: buildTemplateContent(kind), kind } : {}),
      });
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

  // 회차가 아닌 템플릿(인물·설정 카드) 메뉴 항목 — 노드 메뉴·빈 영역 메뉴·상단 템플릿 버튼이 공유.
  const templateItems = useCallback(
    (anchorId: string | null): ContextMenuItem[] =>
      DOCUMENT_KINDS.filter((k) => k.value !== "episode").map((k) => ({
        label: `새 ${k.label}`,
        onSelect: () => void create("DOC", anchorId, k.value),
      })),
    [create],
  );

  /** 다중 선택 위에서 연 메뉴 — 묶음에 통하는 동작만 남긴다(이름 변경 같은 건 한 개 전용). */
  const multiMenuItems = useCallback((): ContextMenuItem[] => {
    const targets = targetsOf(multiIds);
    const nodes = targets
      .map((id) => documents.find((d) => d.id === id))
      .filter((d): d is DocumentNode => !!d);
    const items: ContextMenuItem[] = [];
    if (onMoveToParent || onMoveManyToParent) {
      if (nodes.some((d) => d.parentId !== null)) {
        items.push({
          label: `${targets.length}개 최상위로`,
          onSelect: () => moveMany(targets, null),
        });
      }
      // '한 단계 위로'는 부모가 같을 때만 뜻이 통한다(제각각이면 어디로 갈지 알 수 없다).
      const parents = new Set(nodes.map((d) => d.parentId));
      const parentId = parents.size === 1 ? [...parents][0] : null;
      const grandParentId = parentId
        ? documents.find((d) => d.id === parentId)?.parentId ?? null
        : null;
      if (grandParentId !== null) {
        items.push({
          label: `${targets.length}개 한 단계 위로`,
          onSelect: () => moveMany(targets, grandParentId),
        });
      }
    }
    items.push({
      label: `${targets.length}개 휴지통으로`,
      danger: true,
      onSelect: () => setDeleteTarget({ kind: "many", ids: targets }),
    });
    return items;
  }, [documents, moveMany, multiIds, onMoveManyToParent, onMoveToParent, targetsOf]);

  const nodeMenuItems = useCallback(
    (node: DocumentNode): ContextMenuItem[] => {
      if (multi && selectedIds.has(node.id)) return multiMenuItems();
      const items: ContextMenuItem[] = [
        { label: "새 문서", onSelect: () => void create("DOC", node.id) },
        { label: "새 폴더", onSelect: () => void create("FOLDER", node.id) },
        ...templateItems(node.id),
        { label: "이름 변경", onSelect: () => setEditingId(node.id) },
      ];
      // 폴더 안에 든 항목은 밖으로 꺼낼 길이 있어야 한다(드래그만으로는 최상위에 폴더뿐일 때 못 나간다).
      if (node.parentId !== null && onMoveToParent) {
        const parent = documents.find((d) => d.id === node.parentId);
        const grandParentId = parent?.parentId ?? null;
        items.push({
          label: grandParentId === null ? "최상위로 이동" : "한 단계 위로 이동",
          onSelect: () => onMoveToParent(node.id, grandParentId),
        });
        if (grandParentId !== null) {
          items.push({ label: "최상위로 이동", onSelect: () => onMoveToParent(node.id, null) });
        }
      }
      items.push({
        label: "삭제",
        danger: true,
        onSelect: () => setDeleteTarget({ kind: "one", node }),
      });
      return items;
    },
    [
      create,
      documents,
      multi,
      multiMenuItems,
      onMoveToParent,
      selectedIds,
      templateItems,
    ],
  );

  const openNodeMenu = (node: DocumentNode, x: number, y: number) => {
    setActiveId(node.id);
    // 선택 묶음 바깥을 우클릭하면 묶음은 풀린다 — 메뉴가 가리키는 대상과 화면 강조가 어긋나지 않게.
    if (multi && !selectedIds.has(node.id)) clearSelection();
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
      onSelect(row.node.id); // 폴더도 선택(연속 보기) — 마우스 클릭과 같게. 접기는 ←/→.
    } else if (e.key === "Escape") {
      if (selectedIds.size === 0) return;
      e.stopPropagation(); // 집중 모드 종료 등 바깥 Esc 처리까지 함께 터지지 않게
      clearSelection();
    } else if (e.key === "F2") {
      if (!row) return;
      e.preventDefault();
      // 에디터가 window에서 F2(제목 편집)를 듣고 있다 — 바인더에서 누른 F2까지 가로채
      // 본문 제목칸으로 포커스가 튀지 않게 여기서 끊는다.
      e.stopPropagation();
      setEditingId(row.node.id);
    }
  }

  // 삭제 확인 문구 — 한 개면 이름을, 묶음이면 개수를 말한다.
  const deleteTitle =
    deleteTarget === null
      ? ""
      : deleteTarget.kind === "many"
        ? `${deleteTarget.ids.length}개 삭제`
        : `'${deleteTarget.node.title}' 삭제`;
  const deleteDescription =
    deleteTarget === null
      ? ""
      : deleteTarget.kind === "many"
        ? `${deleteTarget.ids.length}개 항목을 휴지통으로 보냅니다. 휴지통에서 되살릴 수 있어요.`
        : deleteTarget.node.type === "FOLDER"
          ? "폴더와 하위 문서를 휴지통으로 보냅니다. 휴지통에서 되살릴 수 있어요."
          : "문서를 휴지통으로 보냅니다. 휴지통에서 되살릴 수 있어요.";

  return (
    <nav aria-label="바인더" className="flex h-full flex-col border-r border-border bg-bg">
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
            label="카드 템플릿"
            hasPopup
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenu({ kind: "template", x: r.left, y: r.bottom + 4 });
            }}
          >
            <TemplateIcon />
          </IconButton>
          <IconButton
            label="라벨 필터"
            hasPopup
            pressed={labelFilter !== null}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenu({ kind: "filter", x: r.left, y: r.bottom + 4 });
            }}
          >
            <FilterIcon />
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

      {/* 여러 개를 고르면 나타나는 얇은 줄 — 묶음으로 할 수 있는 일만 여기 둔다. */}
      {multi && (
        <div className="flex items-center gap-6 border-b border-border bg-surface px-12 py-6 text-caption">
          <span className="shrink-0 font-medium text-fg">
            {multiIds.length}개 선택
          </span>
          <span aria-hidden className="text-fg-weak">
            ·
          </span>
          <BarButton
            label="선택 항목 휴지통으로"
            danger
            onClick={() =>
              setDeleteTarget({ kind: "many", ids: targetsOf(multiIds) })
            }
          >
            휴지통
          </BarButton>
          <BarButton
            label="선택 항목 최상위로"
            onClick={() => moveMany(targetsOf(multiIds), null)}
          >
            최상위로
          </BarButton>
          <BarButton label="선택 해제" className="ml-auto" onClick={clearSelection}>
            선택 해제
          </BarButton>
        </div>
      )}

      {/* 라벨 필터가 켜져 있다는 사실을 늘 보이게 — 원고가 사라진 줄 알고 놀라지 않도록. */}
      {labelFilter !== null && (
        <div className="flex items-center gap-6 border-b border-border px-12 py-4 text-caption text-fg-weak">
          {activeFilterLabel && (
            <span
              aria-hidden
              className={cn(
                "h-8 w-8 shrink-0 rounded-full",
                LABEL_COLOR_CLASS[activeFilterLabel.color],
              )}
            />
          )}
          <span className="min-w-0 truncate">
            라벨: {activeFilterLabel?.name ?? "라벨 없음"}
          </span>
          <BarButton
            label="필터 해제"
            className="ml-auto"
            onClick={() => setLabelFilter(null)}
          >
            해제
          </BarButton>
        </div>
      )}

      <div
        className="flex flex-1 flex-col overflow-y-auto py-4"
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ kind: "empty", x: e.clientX, y: e.clientY });
        }}
      >
        {documents.length === 0 ? (
          <p className="px-16 py-24 text-center text-body-sm text-fg-weak">
            새 문서 아이콘을 눌러 시작하세요.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-16 py-24 text-center text-body-sm text-fg-weak">
            이 라벨을 단 문서가 없어요.
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
                  // 다중 선택은 aria-selected를 쓰지 않는다 — 트리의 '선택'은 지금 열린 문서 하나뿐이고,
                  // 묶음 강조는 별도 표식으로 알린다(보조기술이 선택 문서를 헷갈리지 않게).
                  data-multiselected={selectedIds.has(node.id) ? "true" : undefined}
                  tabIndex={cursorId === node.id ? 0 : -1}
                  draggable={!editing}
                  onFocus={() => setActiveId(node.id)}
                  onClick={(e) => {
                    if (editing) return;
                    handleRowClick(node, e);
                  }}
                  onDoubleClick={() => setEditingId(node.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openNodeMenu(node, e.clientX, e.clientY);
                  }}
                  onDragStart={(e) => {
                    // 고른 묶음 안에서 하나를 끌면 묶음 전체가 따라온다(스크리브너와 같다).
                    const ids =
                      multi && selectedIds.has(node.id)
                        ? targetsOf(multiIds)
                        : [node.id];
                    // dataTransfer에는 대표 하나만 — 나머지는 바인더 안에서만 아는 상태로 둔다.
                    e.dataTransfer.setData("text/plain", ids[0] ?? node.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragIds(ids);
                    setDragId(node.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragIds([]);
                    setDropTarget(null);
                  }}
                  onDragOver={(e) => {
                    // 끌고 있는 항목 자신(묶음 포함) 위에는 놓을 수 없다.
                    if (!dragId || dragIds.includes(node.id)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    // 폴더 위쪽 1/3에 놓으면 '폴더 앞(같은 계층)', 아래쪽은 '폴더 안'.
                    // 스크리브너·옵시디언처럼, 폴더 옆으로 꺼내는 길을 드래그로도 연다.
                    const rect = e.currentTarget.getBoundingClientRect();
                    const nearTop = e.clientY - rect.top < rect.height / 3;
                    setDropTarget({
                      id: node.id,
                      mode: isFolder && !nearTop ? "into" : "before",
                    });
                  }}
                  onDragLeave={() =>
                    setDropTarget((t) => (t?.id === node.id ? null : t))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    const fallback = e.dataTransfer.getData("text/plain") || dragId;
                    const dragged = (
                      dragIds.length > 0 ? dragIds : fallback ? [fallback] : []
                    ).filter((docId) => docId !== node.id);
                    const mode =
                      dropTarget?.id === node.id
                        ? dropTarget.mode
                        : isFolder
                          ? "into"
                          : "before";
                    if (dragged.length > 1) {
                      // 여러 개는 '그 부모의 맨 끝'으로 모아 놓는다(끌어 온 순서 유지).
                      // 정확히 어느 줄 앞인지까지 맞추는 건 하나만 끌 때의 몫이다.
                      moveMany(dragged, mode === "into" ? node.id : node.parentId);
                    } else if (dragged.length === 1) {
                      onMove?.(dragged[0], node.id, mode);
                    }
                    setDropTarget(null);
                    setDragId(null);
                    setDragIds([]);
                  }}
                  className={cn(
                    "group relative flex cursor-pointer select-none items-stretch",
                    "border-t-2 border-transparent text-body-sm outline-none",
                    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    selectedId === node.id
                      ? "bg-primary-weak text-primary"
                      : "text-fg hover:bg-surface",
                    // 묶음에 든 줄은 왼쪽 띠로만 알린다 — 열려 있는 문서의 강조는 그대로 둔다.
                    selectedIds.has(node.id) && "border-l-2 border-l-primary",
                    selectedIds.has(node.id) && selectedId !== node.id && "bg-surface",
                    dragIds.includes(node.id) && "opacity-50",
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
                      <RowTitle node={node} labels={labelList} />
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

        {/* 트리 아래 남는 공간 — 끌어다 놓으면 최상위 맨 끝으로 간다(폴더에서 꺼내는 가장 쉬운 길). */}
        {documents.length > 0 && (
          <div
            aria-label="최상위로 옮기기"
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setRootDrop(true);
            }}
            onDragLeave={() => setRootDrop(false)}
            onDrop={(e) => {
              e.preventDefault();
              const fallback = e.dataTransfer.getData("text/plain") || dragId;
              const dragged =
                dragIds.length > 0 ? dragIds : fallback ? [fallback] : [];
              if (dragged.length > 1) moveMany(dragged, null);
              else if (dragged.length === 1) onMoveToParent?.(dragged[0], null);
              setRootDrop(false);
              setDragId(null);
              setDragIds([]);
              setDropTarget(null);
            }}
            className={cn(
              "mx-8 mt-4 flex min-h-[56px] flex-1 items-start justify-center rounded-md border border-dashed text-caption transition-colors",
              dragId
                ? rootDrop
                  ? "border-primary bg-primary-weak text-primary"
                  : "border-border-strong text-fg-weak"
                : "border-transparent text-transparent",
            )}
          >
            {dragId && <span className="pt-8">여기 놓으면 최상위로</span>}
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
            ...templateItems(null),
          ]}
          onClose={() => setMenu(null)}
        />
      )}
      {menu?.kind === "template" && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label="템플릿 메뉴"
          items={templateItems(cursorId)}
          onClose={() => setMenu(null)}
        />
      )}
      {menu?.kind === "filter" && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label="라벨 필터"
          items={[
            {
              label: "전체",
              checked: labelFilter === null,
              onSelect: () => setLabelFilter(null),
            },
            ...labelList.map((l) => ({
              label: l.name,
              checked: labelFilter === l.id,
              dotClass: LABEL_COLOR_CLASS[l.color],
              onSelect: () => setLabelFilter(l.id),
            })),
            {
              label: "라벨 없음",
              checked: labelFilter === "none",
              onSelect: () => setLabelFilter("none"),
            },
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
          if (deleteTarget?.kind === "one") onDelete(deleteTarget.node.id);
          else if (deleteTarget?.kind === "many") deleteMany(deleteTarget.ids);
          setDeleteTarget(null);
        }}
        title={deleteTitle}
        description={deleteDescription}
        danger
        confirmText="삭제"
      />
    </nav>
  );
}

/**
 * 행의 이름칸 — 앞에 라벨 색 막대, 뒤에 상태 점.
 * 둘 다 '있을 때만' 그린다(초고는 표시 없음) — 평소 바인더는 이름만 보이는 게 기본이다.
 */
function RowTitle({
  node,
  labels,
}: {
  node: DocumentNode;
  labels: ProjectLabel[];
}) {
  const label = findLabel(labels, node.label);
  const status = normalizeStatus(node.status);
  return (
    <>
      {label && (
        <span
          role="img"
          aria-label={`라벨: ${label.name}`}
          title={`라벨: ${label.name}`}
          className={cn("h-14 w-2 shrink-0 rounded-full", LABEL_COLOR_CLASS[label.color])}
        />
      )}
      <span className="min-w-0 flex-1 truncate" title={node.title}>
        {node.title}
        {node.kind && node.kind !== "episode" && (
          <span className="ml-6 rounded-sm bg-surface px-4 text-caption text-fg-muted">
            {kindLabel(node.kind)}
          </span>
        )}
      </span>
      {status !== "draft" && (
        <span
          role="img"
          aria-label={`상태: ${docStatusLabel(status)}`}
          title={`상태: ${docStatusLabel(status)}`}
          className={cn(
            "h-6 w-6 shrink-0 rounded-full",
            status === "revise" ? "bg-warning" : "bg-success",
          )}
        />
      )}
    </>
  );
}

/** 상단 줄의 작은 아이콘 버튼 — 이름은 보조기술/툴팁으로만 노출한다. */
function IconButton({
  label,
  children,
  onClick,
  hasPopup,
  pressed,
}: {
  label: string;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasPopup?: boolean;
  /** 켜짐/꺼짐이 있는 버튼(라벨 필터)만 넘긴다 — 켜져 있으면 색으로도 알린다. */
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-haspopup={hasPopup ? "menu" : undefined}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-sm p-4 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pressed ? "bg-primary-weak text-primary" : "text-fg-weak",
      )}
    >
      {children}
    </button>
  );
}

/** 선택 바·필터 줄의 글자 버튼 — 이름(보조기술)과 화면 글자를 따로 둔다. */
function BarButton({
  label,
  children,
  onClick,
  danger,
  className,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-sm px-4 py-1 hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        danger ? "text-error" : "text-fg-weak hover:text-fg",
        className,
      )}
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
