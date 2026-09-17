"use client";

// 작업실 우측 패널 모음(인스펙터·노트·타임라인·설정 점검·집필 현황·검색·영감·휴지통).
// 모두 집중 모드에서는 숨고, 열림 여부는 헤더 칩과 같은 상태(openPanels)를 본다.

import { Inspector } from "@widgets/inspector";
import { SnapshotPanel } from "@widgets/snapshot-panel";
import { NotesPanel } from "@widgets/notes-panel";
import { StatsPanel } from "@widgets/stats-panel";
import { TimelinePanel } from "@widgets/timeline-panel";
import { ConsistencyPanel } from "@widgets/consistency-panel";
import { IdeaPanel } from "@widgets/idea-panel";
import { CharacterRelationsSummary } from "@widgets/relation-map";
import { SearchPanel } from "@features/search-document";
import { TrashPanel } from "@features/trash-document";
import type { DocumentNode } from "@entities/document";
import { useToast, cn } from "@shared/ui";
import type { DocumentsApi, ProjectApi } from "../model/types";
import type { WorkspacePanels } from "../model/useWorkspacePanels";
import type { WorkspaceSelection } from "../model/useWorkspaceSelection";

// 우측 패널 공통 클래스 — 넓은 화면은 본문 옆에 나란히, 좁은 화면(md 미만)은 헤더 아래 오버레이.
// 헤더는 가리지 않아 칩으로 다시 닫을 수 있다.
const SIDE_PANEL =
  "shrink-0 overflow-y-auto border-l border-border bg-surface p-16 " +
  "max-md:fixed max-md:bottom-0 max-md:right-0 max-md:top-48 max-md:z-30 max-md:!w-[min(100vw,360px)] max-md:shadow-lg";

interface WorkspaceSidePanelsProps {
  projectId: string;
  documents: DocumentNode[];
  selection: WorkspaceSelection;
  panels: WorkspacePanels;
  docs: DocumentsApi;
  projectApi: ProjectApi;
  /** 현재 편집 중인 문서의 실시간 분량(선택 단위 기준). */
  liveWords: number;
  projectTotalWords: number;
  /** 스냅샷 복원 완료 콜백(문서 캐시 갱신 + 에디터 재마운트). */
  onRestored: () => void | Promise<void>;
}

export function WorkspaceSidePanels({
  projectId,
  documents,
  selection,
  panels,
  docs,
  projectApi,
  liveWords,
  projectTotalWords,
  onRestored,
}: WorkspaceSidePanelsProps) {
  const { selected, setSelectedId } = selection;
  const { openPanels, panelSetters, inspectorTab, setInspectorTab, focusMode, setViewMode } =
    panels;
  const { toast } = useToast();
  const { project } = projectApi;

  return (
    <>
      {/* 우: 인스펙터 (기본 접힘) — 정보 / 스냅샷 탭. 집중 모드에서는 숨김 */}
      {openPanels.inspector && !focusMode && (
        <aside className={cn(SIDE_PANEL, "w-[280px]")}>
          <div role="tablist" aria-label="인스펙터 탭" className="mb-12 flex gap-4">
            <button
              type="button"
              role="tab"
              id="inspector-tab-info"
              aria-controls="inspector-panel-info"
              aria-selected={inspectorTab === "info"}
              onClick={() => setInspectorTab("info")}
              className={
                inspectorTab === "info"
                  ? "rounded-md px-8 py-4 text-caption font-medium text-fg"
                  : "rounded-md px-8 py-4 text-caption text-fg-weak hover:text-fg"
              }
            >
              정보
            </button>
            <button
              type="button"
              role="tab"
              id="inspector-tab-snapshots"
              aria-controls="inspector-panel-snapshots"
              aria-selected={inspectorTab === "snapshots"}
              onClick={() => setInspectorTab("snapshots")}
              className={
                inspectorTab === "snapshots"
                  ? "rounded-md px-8 py-4 text-caption font-medium text-fg"
                  : "rounded-md px-8 py-4 text-caption text-fg-weak hover:text-fg"
              }
            >
              스냅샷
            </button>
          </div>
          {inspectorTab === "info" && (
            <div role="tabpanel" id="inspector-panel-info" aria-labelledby="inspector-tab-info">
            <Inspector
              doc={selected}
              onSaveSynopsis={docs.updateSynopsis}
              onSaveNote={docs.updateNote}
              onSaveStatus={docs.updateStatus}
              onSaveLabel={docs.updateLabel}
              labels={project?.labels}
              onSaveLabels={projectApi.updateLabels}
              onClearLabelFromDocuments={docs.clearLabelFromDocuments}
              currentWords={liveWords}
              onSaveDocGoal={docs.updateGoal}
              projectTotalWords={projectTotalWords}
              projectGoal={project?.goal}
              onSaveProjectGoal={projectApi.updateGoal}
              deadline={project?.deadline}
              onSaveDeadline={projectApi.updateDeadline}
            />
            {selected && selected.type === "DOC" && selected.kind === "character" && (
              <CharacterRelationsSummary
                projectId={projectId}
                doc={selected}
                documents={documents}
                typeColors={project?.relationTypeColors}
                onOpenRelations={() => setViewMode("relations")}
              />
            )}
            </div>
          )}
          {inspectorTab === "snapshots" && (
            <div
              role="tabpanel"
              id="inspector-panel-snapshots"
              aria-labelledby="inspector-tab-snapshots"
            >
              {selected && selected.type === "DOC" ? (
                <SnapshotPanel doc={selected} onRestored={onRestored} />
              ) : (
                <p className="text-body-sm text-fg-weak">
                  본문 문서를 선택하면 스냅샷을 저장할 수 있어요.
                </p>
              )}
            </div>
          )}
        </aside>
      )}

      {/* 우: 리서치 노트 (캐릭터·설정) — 바인더와 분리된 작품 단위 참고 자료 */}
      {openPanels.notes && !focusMode && (
        <aside className={cn(SIDE_PANEL, "w-[300px]")}>
          <NotesPanel projectId={projectId} />
        </aside>
      )}

      {/* 우: 타임라인(연표) — 사건 순서와 회차 연결 */}
      {openPanels.timeline && !focusMode && (
        <aside className={cn(SIDE_PANEL, "w-[320px]")}>
          <TimelinePanel
            projectId={projectId}
            documents={documents}
            onOpenDocument={(docId) => {
              setSelectedId(docId);
              setViewMode("editor");
            }}
          />
        </aside>
      )}

      {/* 우: 설정 점검 — 고유명사 사전·표기 흔들림·문장 리듬 */}
      {openPanels.check && !focusMode && (
        <aside className={cn(SIDE_PANEL, "w-[320px]")}>
          <ConsistencyPanel
            projectId={projectId}
            documents={documents}
            selectedDoc={selected}
          />
        </aside>
      )}

      {/* 우: 집필 현황 — 오늘 분량·연속 집필일·최근 추이·회차별 분량 */}
      {openPanels.stats && !focusMode && (
        <aside className={cn(SIDE_PANEL, "w-[320px]")}>
          <StatsPanel
            projectId={projectId}
            documents={documents}
            dailyGoal={project?.dailyGoal}
            episodeGoal={project?.episodeGoal}
            projectGoal={project?.goal}
            projectWords={projectTotalWords}
            onSaveDailyGoal={projectApi.updateDailyGoal}
            onSaveEpisodeGoal={projectApi.updateEpisodeGoal}
            onSelectDocument={setSelectedId}
          />
        </aside>
      )}

      {/* 우: 검색 — 제목·본문 검색, 결과 클릭 시 문서 선택 */}
      {openPanels.search && !focusMode && (
        <aside className={cn(SIDE_PANEL, "w-[300px] overflow-hidden")}>
          <SearchPanel
            documents={documents}
            onSelect={(docId) => {
              setSelectedId(docId);
              panelSetters.search(false);
            }}
          />
        </aside>
      )}

      {/* 우: 영감 서랍 — 카드 뽑기·조합기(오프라인) / AI 발상(내 키) / 아이디어 메모 */}
      {openPanels.ideas && !focusMode && (
        <aside className={cn(SIDE_PANEL, "w-[340px]")}>
          <IdeaPanel
            projectId={projectId}
            project={project}
            documents={documents}
            selectedDoc={selected}
            onSaveGenre={projectApi.updateGenre}
            onSaveAiModel={projectApi.updateAiModel}
            onOpenDocument={(docId) => {
              setSelectedId(docId);
              setViewMode("editor");
            }}
          />
        </aside>
      )}

      {/* 우: 휴지통 — 소프트 삭제 문서 복원 / 영구 삭제 */}
      {openPanels.trash && !focusMode && (
        <aside className={cn(SIDE_PANEL, "w-[300px] overflow-hidden")}>
          <TrashPanel
            trashedDocuments={docs.trashedDocuments}
            onRestore={async (docId) => {
              const node = docs.trashedDocuments.find((d) => d.id === docId);
              try {
                await docs.restoreDocument(docId);
                // 복원한 게 본문 문서면 바로 선택해 보여준다(폴더면 바인더에서 펼치도록 둔다).
                if (node?.type === "DOC") setSelectedId(docId);
              } catch {
                toast("복원에 실패했어요.", "error");
              }
            }}
            onPermanentDelete={async (docId) => {
              try {
                await docs.permanentlyDeleteDocument(docId);
              } catch {
                toast("영구 삭제에 실패했어요.", "error");
              }
            }}
          />
        </aside>
      )}
    </>
  );
}
