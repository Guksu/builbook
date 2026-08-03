"use client";

import Link from "next/link";
import { ThemeToggle } from "@features/toggle-theme";
import { cn } from "@shared/ui";

/** 오른쪽 레일 패널 식별자 — 열림 표시등·토글이 공유하는 단일 키. */
export type WorkspacePanelKey =
  | "timeline"
  | "stats"
  | "check"
  | "search"
  | "notes"
  | "trash"
  | "ai"
  | "inspector";

// 성격이 같은 패널끼리 묶어 간격으로 구분한다: 집필 관리 / 자료 / 보조 뷰.
const PANEL_GROUPS: { key: WorkspacePanelKey; label: string }[][] = [
  [
    { key: "timeline", label: "연표" },
    { key: "stats", label: "현황" },
    { key: "check", label: "점검" },
  ],
  [
    { key: "search", label: "검색" },
    { key: "notes", label: "리서치" },
    { key: "trash", label: "휴지통" },
  ],
  [
    { key: "ai", label: "AI 문답" },
    { key: "inspector", label: "인스펙터" },
  ],
];

interface WorkspaceHeaderProps {
  projectTitle?: string;
  /** 작품 전체 단어 수 — 편집 중 문서는 실시간 값으로 치환된 합계. */
  totalWords: number;
  viewMode: "editor" | "corkboard";
  onChangeViewMode: (mode: "editor" | "corkboard") => void;
  openPanels: Record<WorkspacePanelKey, boolean>;
  onTogglePanel: (key: WorkspacePanelKey) => void;
  onOpenPreview: () => void;
  previewDisabled?: boolean;
  onOpenExport: () => void;
  onEnterFocus: () => void;
}

/**
 * 작업 화면 상단 바 — 좌(작품 정체성) · 중(본문↔카드 전환) · 우(패널 표시등·도구).
 * 패널 토글은 라벨을 바꾸지 않고 표시등(dot)으로 열림 상태를 보여준다.
 */
export function WorkspaceHeader({
  projectTitle,
  totalWords,
  viewMode,
  onChangeViewMode,
  openPanels,
  onTogglePanel,
  onOpenPreview,
  previewDisabled,
  onOpenExport,
  onEnterFocus,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex h-48 items-center gap-16 border-b border-border pl-8 pr-12">
      {/* 좌: 어디에서 얼마나 쓰고 있는지 */}
      <div className="flex min-w-0 flex-1 items-center gap-6">
        <Link
          href="/dashboard"
          aria-label="작품 목록으로 돌아가기"
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md text-fg-weak transition-colors hover:bg-surface hover:text-fg"
        >
          <IconChevronLeft />
        </Link>
        <p className="truncate text-body-sm font-medium text-fg">
          {projectTitle ?? "작품"}
        </p>
        <span className="shrink-0 text-caption tabular-nums text-fg-muted">
          {totalWords.toLocaleString("ko-KR")}단어
        </span>
      </div>

      {/* 중: 가운데 화면 전환 — 본문 ↔ 카드 */}
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
      </div>

      {/* 우: 패널 표시등 그룹 · 일회성 동작 · 모드 */}
      <div
        role="toolbar"
        aria-label="작업 패널과 도구"
        className="flex items-center gap-10 overflow-x-auto"
      >
        {PANEL_GROUPS.map((group) => (
          <div key={group[0].key} className="flex items-center gap-2">
            {group.map(({ key, label }) => (
              <PanelChip
                key={key}
                label={label}
                active={openPanels[key]}
                onClick={() => onTogglePanel(key)}
              />
            ))}
          </div>
        ))}

        <Divider />

        {/* 일회성 동작 — 패널 토글과 달리 표시등이 없다 */}
        <div className="flex items-center gap-2">
          <ActionButton onClick={onOpenPreview} disabled={previewDisabled}>
            미리보기
          </ActionButton>
          <ActionButton onClick={onOpenExport}>내보내기</ActionButton>
        </div>

        <Divider />

        <ThemeToggle />
        <button
          type="button"
          onClick={onEnterFocus}
          className="flex h-32 shrink-0 items-center gap-6 rounded-full border border-border px-12 text-caption text-fg-weak transition-colors hover:border-border-strong hover:bg-surface hover:text-fg"
        >
          <IconFocus />
          집중
        </button>
      </div>
    </header>
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
      {label}
    </button>
  );
}

function PanelChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
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
          active ? "bg-primary" : "bg-border-strong group-hover:bg-fg-muted",
        )}
      />
      {label}
    </button>
  );
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="h-28 shrink-0 rounded-full px-10 text-caption text-fg-weak transition-colors hover:bg-surface hover:text-fg disabled:pointer-events-none disabled:opacity-40"
    />
  );
}

function Divider() {
  return <span aria-hidden className="h-16 w-1 shrink-0 bg-border" />;
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
