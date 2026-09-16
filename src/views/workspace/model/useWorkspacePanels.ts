"use client";

// 작업실 화면의 '무엇이 열려 있나' 상태 모음.
// 우측 패널 8종(표시등 매핑 포함) · 보기 모드(본문↔카드) · 집중 모드(ESC 해제) ·
// 좁은 화면 바인더 드로어 · 인스펙터 탭 · 코르크보드 필터를 한 훅으로 묶는다.

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { isCardSize, type CardLabelFilter, type CardSize } from "@features/corkboard";
import type { WorkspacePanelKey } from "@widgets/workspace-header";
import { usePersistedState } from "@shared/ui";

export type WorkspaceViewMode = "editor" | "corkboard";
export type InspectorTab = "info" | "snapshots";

export interface WorkspacePanels {
  openPanels: Record<WorkspacePanelKey, boolean>;
  panelSetters: Record<WorkspacePanelKey, Dispatch<SetStateAction<boolean>>>;
  inspectorTab: InspectorTab;
  setInspectorTab: Dispatch<SetStateAction<InspectorTab>>;
  binderOpen: boolean;
  setBinderOpen: Dispatch<SetStateAction<boolean>>;
  viewMode: WorkspaceViewMode;
  setViewMode: Dispatch<SetStateAction<WorkspaceViewMode>>;
  focusMode: boolean;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
  previewOpen: boolean;
  setPreviewOpen: Dispatch<SetStateAction<boolean>>;
  exportOpen: boolean;
  setExportOpen: Dispatch<SetStateAction<boolean>>;
  cardLabelFilter: CardLabelFilter;
  setCardLabelFilter: (next: CardLabelFilter) => void;
  cardSize: CardSize;
  setCardSize: (next: CardSize) => void;
}

export function useWorkspacePanels(projectId: string): WorkspacePanels {
  // 좁은 화면(md 미만) 전용: 바인더를 드로어로 띄운다. 넓은 화면에서는 값과 무관하게 항상 보인다.
  const [binderOpen, setBinderOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("info");
  const [notesOpen, setNotesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  // 가운데 영역 보기 모드: 본문(에디터) ↔ 카드(코르크보드).
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>("editor");
  const [previewOpen, setPreviewOpen] = useState(false);
  // 코르크보드 라벨 필터·카드 크기 — 작품별로 기억. 범위는 선택된 폴더가 결정한다.
  const [cardLabelFilter, setCardLabelFilter] = usePersistedState<CardLabelFilter>(
    `builbook:card-label-filter:${projectId}`,
    null,
    (v): v is CardLabelFilter => v === null || typeof v === "string",
  );
  const [cardSize, setCardSize] = usePersistedState<CardSize>(
    `builbook:card-size:${projectId}`,
    "medium",
    isCardSize,
  );
  // 집중 모드: 주변 UI를 숨기고 본문에만 몰입(에디터 인스턴스는 재마운트 없이 유지).
  const [focusMode, setFocusMode] = useState(false);

  // 집중 모드에서 ESC로 빠져나오기.
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  // 헤더 패널 표시등 ↔ 개별 open 상태 매핑.
  const openPanels: Record<WorkspacePanelKey, boolean> = {
    timeline: timelineOpen,
    stats: statsOpen,
    check: checkOpen,
    search: searchOpen,
    notes: notesOpen,
    trash: trashOpen,
    inspector: inspectorOpen,
  };
  const panelSetters: Record<
    WorkspacePanelKey,
    Dispatch<SetStateAction<boolean>>
  > = {
    timeline: setTimelineOpen,
    stats: setStatsOpen,
    check: setCheckOpen,
    search: setSearchOpen,
    notes: setNotesOpen,
    trash: setTrashOpen,
    inspector: setInspectorOpen,
  };

  return {
    openPanels,
    panelSetters,
    inspectorTab,
    setInspectorTab,
    binderOpen,
    setBinderOpen,
    viewMode,
    setViewMode,
    focusMode,
    setFocusMode,
    previewOpen,
    setPreviewOpen,
    exportOpen,
    setExportOpen,
    cardLabelFilter,
    setCardLabelFilter,
    cardSize,
    setCardSize,
  };
}
