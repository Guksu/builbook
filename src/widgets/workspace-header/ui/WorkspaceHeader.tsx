"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { cn, ContextMenu, useModLabel } from "@shared/ui";

/** 가운데 화면 — 본문(에디터) · 카드(코르크보드) · 관계(인물 관계도). */
export type WorkspaceViewMode = "editor" | "corkboard" | "relations";

/** 오른쪽 레일 패널 식별자 — 열림 표시등·토글이 공유하는 단일 키. */
export type WorkspacePanelKey =
  | "timeline"
  | "stats"
  | "check"
  | "search"
  | "notes"
  | "trash"
  | "ideas"
  | "inspector";

// 헤더에 칩 7개를 늘어놓으면 눈이 갈 곳이 없다(사용자 피드백). 자주 쓰는 인스펙터만 남기고
// 나머지 패널은 "패널" 메뉴 하나로, 일회성 동작·테마는 "더 보기" 메뉴로 모은다.
const PANEL_MENU: { key: WorkspacePanelKey; label: string }[] = [
  { key: "timeline", label: "연표" },
  { key: "stats", label: "현황" },
  { key: "check", label: "점검" },
  { key: "search", label: "검색" },
  { key: "notes", label: "리서치" },
  { key: "trash", label: "휴지통" },
  { key: "ideas", label: "영감" },
];

type HeaderMenu = { kind: "panels" | "more"; x: number; y: number } | null;

interface WorkspaceHeaderProps {
  projectTitle?: string;
  /** 작품 제목 변경 — 있으면 제목을 눌러 그 자리에서 고칠 수 있다. */
  onRenameProject?: (title: string) => void;
  /** 작품 전체 분량 표기(예: "12,345자") — 편집 중 문서는 실시간 값으로 치환된 합계. */
  totalLabel: string;
  viewMode: WorkspaceViewMode;
  onChangeViewMode: (mode: WorkspaceViewMode) => void;
  openPanels: Record<WorkspacePanelKey, boolean>;
  onTogglePanel: (key: WorkspacePanelKey) => void;
  onOpenPreview: () => void;
  previewDisabled?: boolean;
  onOpenExport: () => void;
  onEnterFocus: () => void;
  /** 좁은 화면(md 미만)에서 바인더 드로어를 여닫는다. */
  onToggleBinder?: () => void;
  binderOpen?: boolean;
  /** 목표 바(있을 때만) — 왼쪽 그룹 끝에 붙는다. */
  goalSlot?: React.ReactNode;
}

/**
 * 작업 화면 상단 바 — 좌(작품 정체성) · 중(본문↔카드 전환) · 우(패널 표시등·도구).
 * 패널 토글은 라벨을 바꾸지 않고 표시등(dot)으로 열림 상태를 보여준다.
 */
export function WorkspaceHeader({
  projectTitle,
  onRenameProject,
  totalLabel,
  viewMode,
  onChangeViewMode,
  openPanels,
  onTogglePanel,
  onOpenPreview,
  previewDisabled,
  onOpenExport,
  onEnterFocus,
  onToggleBinder,
  binderOpen,
  goalSlot,
}: WorkspaceHeaderProps) {
  const [menu, setMenu] = useState<HeaderMenu>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const openCount = PANEL_MENU.filter((p) => openPanels[p.key]).length;
  const mod = useModLabel();
  const shortcutHint = (n: number) => `${mod}+Shift+${n}`;
  const openMenu = (kind: "panels" | "more") => (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ kind, x: r.right - 200, y: r.bottom + 4 });
  };
  return (
    <header className="flex h-48 items-center gap-16 border-b border-border pl-8 pr-12 max-md:gap-8 max-md:overflow-x-auto">
      {/* 좌: 어디에서 얼마나 쓰고 있는지 — 좁은 화면에서는 줄어들지 않고 제목만 자른다 */}
      <div className="flex min-w-0 flex-1 items-center gap-6 max-md:max-w-[44vw] max-md:flex-none">
        {/* 좁은 화면: 바인더는 드로어 — 여기서 연다 */}
        {onToggleBinder && (
          <button
            type="button"
            aria-label="바인더"
            aria-pressed={!!binderOpen}
            onClick={onToggleBinder}
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md text-fg-weak transition-colors hover:bg-surface hover:text-fg md:hidden"
          >
            <IconMenu />
          </button>
        )}
        <Link
          href="/dashboard"
          aria-label="작품 목록으로 돌아가기"
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md text-fg-weak transition-colors hover:bg-surface hover:text-fg"
        >
          <IconChevronLeft />
        </Link>
        <ProjectTitle title={projectTitle} onRename={onRenameProject} />
        <span className="shrink-0 text-caption tabular-nums text-fg-muted max-sm:hidden">
          {totalLabel}
        </span>
        {goalSlot}
      </div>

      {/* 중: 가운데 화면 전환 — 본문 · 카드 · 관계 */}
      <div
        role="group"
        aria-label="가운데 화면 전환"
        className="flex shrink-0 rounded-lg bg-surface p-2"
      >
        <SegmentButton
          active={viewMode === "editor"}
          onClick={() => onChangeViewMode("editor")}
          icon={<IconLines />}
          label="본문"
        />
        <SegmentButton
          active={viewMode === "corkboard"}
          onClick={() => onChangeViewMode("corkboard")}
          icon={<IconCards />}
          label="카드"
        />
        <SegmentButton
          active={viewMode === "relations"}
          onClick={() => onChangeViewMode("relations")}
          icon={<IconRelations />}
          label="관계"
        />
      </div>

      {/* 우: 패널 표시등 그룹 · 일회성 동작 · 모드 */}
      <div
        role="toolbar"
        aria-label="작업 패널과 도구"
        className="flex items-center gap-10 overflow-x-auto"
      >
        {/* 패널 메뉴 — 열린 패널 수를 배지로 */}
        <button
          type="button"
          aria-label="패널"
          aria-haspopup="menu"
          aria-expanded={menu?.kind === "panels"}
          onClick={openMenu("panels")}
          className={cn(
            "flex h-28 shrink-0 items-center gap-6 rounded-full px-10 text-caption transition-colors",
            openCount > 0 ? "bg-primary-weak text-fg" : "text-fg-weak hover:bg-surface hover:text-fg",
          )}
        >
          <IconPanels />
          패널
          {openCount > 0 && (
            <span className="rounded-full bg-primary px-6 text-[11px] leading-[16px] text-primary-fg">
              {openCount}
            </span>
          )}
          <IconCaret />
        </button>
        <PanelChip
          label="인스펙터"
          hint={shortcutHint(PANEL_MENU.length + 1)}
          active={openPanels.inspector}
          onClick={() => onTogglePanel("inspector")}
        />

        <Divider />

        {/* 더 보기 — 미리보기·내보내기·테마 */}
        <button
          type="button"
          aria-label="더 보기"
          aria-haspopup="menu"
          aria-expanded={menu?.kind === "more"}
          onClick={openMenu("more")}
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full text-fg-weak transition-colors hover:bg-surface hover:text-fg"
        >
          <IconMore />
        </button>
        <button
          type="button"
          onClick={onEnterFocus}
          className="flex h-32 shrink-0 items-center gap-6 rounded-full border border-border px-12 text-caption text-fg-weak transition-colors hover:border-border-strong hover:bg-surface hover:text-fg"
        >
          <IconFocus />
          집중
        </button>
      </div>

      {menu?.kind === "panels" && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label="패널 메뉴"
          items={PANEL_MENU.map((p, i) => ({
            label: p.label,
            checked: openPanels[p.key],
            checkbox: true,
            hint: shortcutHint(i + 1),
            onSelect: () => onTogglePanel(p.key),
          }))}
          onClose={() => setMenu(null)}
        />
      )}
      {menu?.kind === "more" && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label="더 보기 메뉴"
          items={[
            { label: "미리보기", disabled: previewDisabled, onSelect: onOpenPreview },
            { label: "내보내기", onSelect: onOpenExport },
            {
              label: isDark ? "라이트 모드로 전환" : "다크 모드로 전환",
              onSelect: () => setTheme(isDark ? "light" : "dark"),
            },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </header>
  );
}

function IconPanels() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2.5v11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconCaret() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="3.5" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="12.5" cy="8" r="1.5" />
    </svg>
  );
}

function SegmentButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-28 items-center gap-6 rounded-md px-10 text-caption transition-colors",
        active ? "bg-bg text-fg shadow-sm" : "text-fg-weak hover:text-fg",
      )}
    >
      {icon}
      <span className="max-sm:hidden">{label}</span>
    </button>
  );
}

function PanelChip({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={hint ? `${label} (${hint})` : label}
      onClick={onClick}
      className={cn(
        "group flex h-28 shrink-0 items-center gap-6 rounded-full px-10 text-caption transition-colors",
        active
          ? "bg-primary-weak text-fg"
          : "text-fg-weak hover:bg-surface hover:text-fg",
      )}
    >
      {/* 표시등 — 패널이 열려 있으면 켜진다 */}
      <span
        aria-hidden
        className={cn(
          "h-4 w-4 rounded-full transition-colors",
          active ? "bg-primary" : "bg-transparent group-hover:bg-fg-muted",
        )}
      />
      {label}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="h-16 w-1 shrink-0 bg-border" />;
}

function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 3 5 8l5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLines() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4.5h10M3 8h10M3 11.5h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconRelations() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 4h4M5 6l2 4M11 6l-2 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCards() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="2.5"
        width="4.5"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="9"
        y="2.5"
        width="4.5"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="2.5"
        y="9"
        width="4.5"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="9"
        y="9"
        width="4.5"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconFocus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.75" fill="currentColor" />
    </svg>
  );
}

/**
 * 작품 제목 — 누르면 입력칸으로 바뀐다(바인더 이름 편집과 같은 규칙).
 * Enter/포커스 아웃=확정, Esc=취소. 한글 IME 조합 중 Enter는 '조합 확정'이라 무시한다.
 */
function ProjectTitle({
  title,
  onRename,
}: {
  title?: string;
  onRename?: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelled = useRef(false);

  // 작품을 아직 못 읽었거나 수정 경로가 없으면 읽기 전용.
  if (!title || !onRename) {
    // 버튼과 같은 안쪽 여백 — 제목이 읽힌 뒤 글자가 옆으로 밀리지 않게.
    return <p className="truncate px-6 text-body-sm font-medium text-fg">{title ?? "작품"}</p>;
  }

  if (editing) {
    return (
      <input
        aria-label="작품 제목"
        autoFocus
        value={draft}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.currentTarget.blur(); // blur에서 한 번만 확정
          } else if (e.key === "Escape") {
            cancelled.current = true;
            e.currentTarget.blur();
          }
        }}
        onBlur={() => {
          setEditing(false);
          const next = draft.trim();
          // 취소했거나, 비었거나(제목 없는 작품은 목록에서 찾을 수 없다), 그대로면 저장하지 않는다.
          if (cancelled.current || !next || next === title) return;
          onRename(next);
        }}
        className="h-28 w-[240px] min-w-0 rounded-md border border-primary bg-bg px-6 text-body-sm font-medium text-fg outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      title="작품 제목 바꾸기"
      onClick={() => {
        cancelled.current = false;
        setDraft(title);
        setEditing(true);
      }}
      className="min-w-0 truncate rounded-md px-6 py-2 text-left text-body-sm font-medium text-fg transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {title}
    </button>
  );
}
