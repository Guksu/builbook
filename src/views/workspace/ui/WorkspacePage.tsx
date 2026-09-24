"use client";

// 작업실 화면 조립 — 상태·로직은 model/ 훅에, 그리기는 ui/ 컴포넌트에 있다.
// 여기서는 그 둘을 엮어 헤더 · 바인더 · 본문 · 우측 패널 · 오버레이 배치만 한다.

import { useParams } from "next/navigation";
import { WorkspaceHeader, GoalBar } from "@widgets/workspace-header";
import { useCountUnit } from "@features/count-unit";
import { useTabGuard } from "@features/tab-guard";
import { useDocuments } from "@entities/document";
import { useProject } from "@entities/project";
import { formatCount, pickCount } from "@shared/lib";
import { useWorkspaceSelection } from "../model/useWorkspaceSelection";
import { useWorkspacePanels } from "../model/useWorkspacePanels";
import { useDocumentActions } from "../model/useDocumentActions";
import { useWorkspaceShortcuts } from "../model/useWorkspaceShortcuts";
import { useWorkspaceProgress } from "../model/useWorkspaceProgress";
import { WorkspaceBinderPane } from "./WorkspaceBinderPane";
import { WorkspaceMain } from "./WorkspaceMain";
import { WorkspaceSidePanels } from "./WorkspaceSidePanels";
import { WorkspaceOverlays } from "./WorkspaceOverlays";

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const docs = useDocuments(id);
  const { documents, isLoading, error } = docs;
  const projectApi = useProject(id);
  const { project } = projectApi;
  const [unit] = useCountUnit();

  const selection = useWorkspaceSelection(id, documents);
  const { selectedId, setSelectedId, selected } = selection;
  const liveWords = pickCount(selection.liveMeasure, unit);
  // 같은 문서를 다른 탭에서도 열었으면 경고(자동저장이 서로 덮어쓰는 사고 예방).
  // 탭 가드는 자동저장 충돌 방지용 — 폴더(연속 보기)에는 걸지 않는다.
  const tabConflict = useTabGuard(selected?.type === "DOC" ? selectedId : null);

  const panels = useWorkspacePanels(id);
  const { openPanels, panelSetters, viewMode, focusMode } = panels;

  const {
    reloadToken,
    handleCreate,
    handleRestored,
    handleMove,
    handleMoveToParent,
    handleMoveManyToParent,
  } = useDocumentActions({
    documents,
    createDocument: docs.createDocument,
    moveDocument: docs.moveDocument,
    reorderSiblings: docs.reorderSiblings,
    mutateDocuments: docs.mutate,
    setSelectedId,
  });

  const { quickOpen, setQuickOpen } = useWorkspaceShortcuts({
    documents,
    selectedId,
    updateStatus: docs.updateStatus,
    onTogglePanel: (key) => panelSetters[key]((v) => !v),
  });

  const { projectTotalWords, focusProgress, projectProgress, todayProgress, pace } =
    useWorkspaceProgress({
      projectId: id,
      documents,
      selected,
      liveWords,
      unit,
      project,
    });

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 바 — 집중 모드에서는 숨김(에디터는 그대로 유지) */}
      {!focusMode && (
        <WorkspaceHeader
          projectTitle={project?.title}
          onRenameProject={projectApi.renameProject}
          totalLabel={formatCount(projectTotalWords, unit)}
          viewMode={viewMode}
          onChangeViewMode={panels.setViewMode}
          openPanels={openPanels}
          onTogglePanel={(key) => panelSetters[key]((v) => !v)}
          onOpenPreview={() => panels.setPreviewOpen(true)}
          previewDisabled={!selected || selected.type !== "DOC"}
          onOpenExport={() => panels.setExportOpen(true)}
          onEnterFocus={() => panels.setFocusMode(true)}
          onToggleBinder={() => panels.setBinderOpen((v) => !v)}
          binderOpen={panels.binderOpen}
          goalSlot={
            <GoalBar
              project={projectProgress}
              today={todayProgress}
              pace={pace}
              unit={unit}
              onClick={() => panelSetters.stats(true)}
            />
          }
        />
      )}

      <div className="flex min-h-0 flex-1">
        <WorkspaceBinderPane
          projectId={id}
          documents={documents}
          selection={selection}
          panels={panels}
          docs={docs}
          project={project}
          onCreate={handleCreate}
          onMove={handleMove}
          onMoveToParent={handleMoveToParent}
          onMoveManyToParent={handleMoveManyToParent}
        />

        {/* 중: 에디터 */}
        <WorkspaceMain
          projectId={id}
          documents={documents}
          selection={selection}
          panels={panels}
          project={project}
          projectApi={projectApi}
          docs={docs}
          isLoading={isLoading}
          error={error}
          tabConflict={tabConflict}
          onMove={handleMove}
          onMoveToParent={handleMoveToParent}
          reloadToken={reloadToken}
          liveWords={liveWords}
          unit={unit}
          focusProgress={focusProgress}
        />

        <WorkspaceSidePanels
          projectId={id}
          documents={documents}
          selection={selection}
          panels={panels}
          docs={docs}
          projectApi={projectApi}
          liveWords={liveWords}
          projectTotalWords={projectTotalWords}
          onRestored={handleRestored}
        />
      </div>

      <WorkspaceOverlays
        documents={documents}
        selection={selection}
        panels={panels}
        projectApi={projectApi}
        quickOpen={quickOpen}
        setQuickOpen={setQuickOpen}
      />
    </div>
  );
}
