"use client";

// 작업실 가운데 영역. 로딩·오류·탭 충돌 배너부터 코르크보드(툴바 포함)·빈 상태·
// 에디터·스크리브닝 연속 보기·인물 관계도·집중 모드 오버레이까지, 본문 자리에 오는 것들을 모두 그린다.

import type { JSONContent } from "@tiptap/react";
import { Editor } from "@widgets/editor";
import { Scrivenings } from "@widgets/scrivenings";
import { Corkboard, CorkboardToolbar } from "@widgets/corkboard";
import { RelationMapView } from "@widgets/relation-map";
import type { GoalProgress } from "@features/writing-goals";
import { TabConflictBanner } from "@features/tab-guard";
import { buildTemplateContent, defaultTitleForKind, type DocumentNode } from "@entities/document";
import { ProgressBar, cn } from "@shared/ui";
import { formatCount, type CountUnit } from "@shared/lib";
import type { DocumentsApi, ProjectApi } from "../model/types";
import type { WorkspacePanels } from "../model/useWorkspacePanels";
import type { WorkspaceSelection } from "../model/useWorkspaceSelection";

interface WorkspaceMainProps {
  projectId: string;
  documents: DocumentNode[];
  selection: WorkspaceSelection;
  panels: WorkspacePanels;
  project: ProjectApi["project"];
  projectApi: ProjectApi;
  docs: DocumentsApi;
  isLoading: boolean;
  error: DocumentsApi["error"];
  tabConflict: boolean;
  onMove: (dragId: string, targetId: string, mode: "into" | "before") => void | Promise<void>;
  onMoveToParent: (docId: string, parentId: string | null) => void | Promise<void>;
  /** 스냅샷 복원 후 에디터를 재마운트시키는 토큰. */
  reloadToken: number;
  /** 현재 편집 중인 문서의 실시간 분량(선택 단위 기준). */
  liveWords: number;
  unit: CountUnit;
  focusProgress: GoalProgress;
}

export function WorkspaceMain({
  projectId,
  documents,
  selection,
  panels,
  project,
  projectApi,
  docs,
  isLoading,
  error,
  tabConflict,
  onMove,
  onMoveToParent,
  reloadToken,
  liveWords,
  unit,
  focusProgress,
}: WorkspaceMainProps) {
  const { selected, selectedId, setSelectedId, setLiveMeasure } = selection;
  const {
    viewMode,
    setViewMode,
    cardLabelFilter,
    setCardLabelFilter,
    cardSize,
    setCardSize,
    focusMode,
    setFocusMode,
  } = panels;

  return (
    <main className="relative min-w-0 flex-1 overflow-y-auto bg-bg">
      {tabConflict && <TabConflictBanner />}
      {isLoading && (
        <p className="p-24 text-body text-fg-weak">불러오는 중…</p>
      )}
      {error && (
        <p className="p-24 text-body text-error">문서를 불러오지 못했어요.</p>
      )}
      {!isLoading && !error && viewMode === "corkboard" && (
        <>
          <CorkboardToolbar
            scopeTitle={selected?.type === "FOLDER" ? selected.title : null}
            onClearScope={() => setSelectedId(null)}
            labels={project?.labels}
            labelFilter={cardLabelFilter}
            onChangeLabelFilter={setCardLabelFilter}
            cardSize={cardSize}
            onChangeCardSize={setCardSize}
          />
          <Corkboard
            scopeId={selected?.type === "FOLDER" ? selected.id : null}
            scopeParentId={selected?.type === "FOLDER" ? selected.parentId : undefined}
            onMoveToParent={onMoveToParent}
            labelFilter={cardLabelFilter}
            cardSize={cardSize}
            documents={documents}
            selectedId={selectedId}
            onOpen={(docId) => {
              setSelectedId(docId);
              setViewMode("editor"); // 카드를 열면 곧바로 본문으로
            }}
            onUpdateSynopsis={docs.updateSynopsis}
            onUpdateStatus={docs.updateStatus}
            labels={project?.labels}
            onMove={onMove}
          />
        </>
      )}
      {!isLoading && !error && viewMode === "relations" && (
        <RelationMapView
          projectId={projectId}
          documents={documents}
          savedLayout={project?.relationLayout}
          onSaveLayout={projectApi.updateRelationLayout}
          onOpenDocument={(docId) => {
            setSelectedId(docId);
            setViewMode("editor");
          }}
          onCreateCharacter={async () => {
            const doc = await docs.createDocument({
              title: defaultTitleForKind("character", documents),
              type: "DOC",
              parentId: null,
              kind: "character",
              content: buildTemplateContent("character"),
            });
            if (doc) setSelectedId(doc.id);
          }}
        />
      )}
      {!isLoading && !error && !selected && viewMode === "editor" && (
        <div className="flex h-full flex-col items-center justify-center gap-8 text-center text-fg-weak">
          <p className="text-body-lg">왼쪽에서 문서를 선택하거나</p>
          <p className="text-body">
            <b className="text-fg">+ 문서</b>로 첫 글을 시작하세요.
          </p>
        </div>
      )}
      {selected && selected.type === "DOC" && viewMode === "editor" && (
        <Editor
          key={`${selected.id}:${reloadToken}`}
          documentId={selected.id}
          projectId={projectId}
          initialContent={(selected.content as JSONContent | null) ?? null}
          title={selected.title}
          onMeasureChange={setLiveMeasure}
          onRename={(t) => docs.renameDocument(selected.id, t)}
          focusMode={focusMode}
        />
      )}
      {/* 폴더를 고르면 그 아래 회차를 한 장으로 이어 본다(스크리브너 Scrivenings) */}
      {selected && selected.type === "FOLDER" && viewMode === "editor" && (
        <Scrivenings
          key={selected.id}
          folder={selected}
          documents={documents}
          projectId={projectId}
          onOpenDocument={setSelectedId}
        />
      )}

      {/* 집중 모드: 은은한 단어 수/진행률 + 나가기(ESC) */}
      {focusMode && (
        <div className="fixed bottom-16 right-16 z-10 flex flex-col items-end gap-6">
          <div className="flex items-center gap-8 rounded-full border border-border bg-surface px-12 py-6 text-caption text-fg-weak shadow-sm">
            <span className="tabular-nums">{formatCount(liveWords, unit)}</span>
            {focusProgress.hasGoal && (
              <>
                <span aria-hidden>·</span>
                <span
                  className={cn(
                    "tabular-nums",
                    focusProgress.reached && "text-success-strong",
                  )}
                >
                  {focusProgress.reached ? "달성" : `${focusProgress.percent}%`}
                </span>
              </>
            )}
            <button
              type="button"
              className="ml-4 text-fg-muted hover:text-fg"
              onClick={() => setFocusMode(false)}
            >
              나가기 (ESC)
            </button>
          </div>
          {focusProgress.hasGoal && (
            <ProgressBar
              value={focusProgress.clampedPercent}
              reached={focusProgress.reached}
              aria-label="집중 모드 진행률"
              className="w-[200px]"
            />
          )}
        </div>
      )}
    </main>
  );
}
