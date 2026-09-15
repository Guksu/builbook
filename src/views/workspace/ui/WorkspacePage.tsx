"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { JSONContent } from "@tiptap/react";
import { Binder } from "@widgets/binder";
import { Editor } from "@widgets/editor";
import { Inspector } from "@widgets/inspector";
import { SnapshotPanel } from "@widgets/snapshot-panel";
import { NotesPanel } from "@widgets/notes-panel";
import { StatsPanel } from "@widgets/stats-panel";
import { Corkboard } from "@widgets/corkboard";
import { TimelinePanel } from "@widgets/timeline-panel";
import { ConsistencyPanel } from "@widgets/consistency-panel";
import {
  WorkspaceHeader,
  type WorkspacePanelKey,
} from "@widgets/workspace-header";
import { planReorder } from "@features/reorder-document";
import { computeProgress } from "@features/writing-goals";
import { useCountUnit } from "@features/count-unit";
import { SearchPanel } from "@features/search-document";
import { TrashPanel } from "@features/trash-document";
import { ExportMenu } from "@features/export-document";
import { ReaderPreview } from "@features/reader-preview";
import { useTabGuard, TabConflictBanner } from "@features/tab-guard";
import { useDocuments, docCount, sumDocCounts, measureDocument } from "@entities/document";
import { useProject } from "@entities/project";
import { useToast, ProgressBar, cn } from "@shared/ui";
import { formatCount, pickCount, ZERO_MEASURE, type TextMeasure } from "@shared/lib";

// 마지막으로 열었던 문서 — 다시 들어오면 그 자리에서 이어 쓴다(작품별).
const lastDocKey = (projectId: string) => `builbook:last-doc:${projectId}`;
function readLastDoc(projectId: string): string | null {
  try {
    return localStorage.getItem(lastDocKey(projectId));
  } catch {
    return null;
  }
}
function writeLastDoc(projectId: string, docId: string) {
  try {
    localStorage.setItem(lastDocKey(projectId), docId);
  } catch {
    /* 저장 불가 브라우저 — 무시 */
  }
}

// 우측 패널 공통 클래스 — 넓은 화면은 본문 옆에 나란히, 좁은 화면(md 미만)은 헤더 아래 오버레이.
// 헤더는 가리지 않아 칩으로 다시 닫을 수 있다.
const SIDE_PANEL =
  "shrink-0 overflow-y-auto border-l border-border bg-surface p-16 " +
  "max-md:fixed max-md:bottom-0 max-md:right-0 max-md:top-48 max-md:z-30 max-md:!w-[min(100vw,360px)] max-md:shadow-lg";

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const {
    documents,
    trashedDocuments,
    isLoading,
    error,
    mutate: mutateDocuments,
    createDocument,
    renameDocument,
    deleteDocument,
    restoreDocument,
    permanentlyDeleteDocument,
    moveDocument,
    reorderSiblings,
    updateSynopsis,
    updateGoal,
    updateStatus,
  } = useDocuments(id);
  const {
    project,
    updateGoal: updateProjectGoal,
    updateDailyGoal,
    updateEpisodeGoal,
  } = useProject(id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 좁은 화면(md 미만) 전용: 바인더를 드로어로 띄운다. 넓은 화면에서는 값과 무관하게 항상 보인다.
  const [binderOpen, setBinderOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"info" | "snapshots">("info");
  const [notesOpen, setNotesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  // 가운데 영역 보기 모드: 본문(에디터) ↔ 카드(코르크보드).
  const [viewMode, setViewMode] = useState<"editor" | "corkboard">("editor");
  const [previewOpen, setPreviewOpen] = useState(false);
  // 집중 모드: 주변 UI를 숨기고 본문에만 몰입(에디터 인스턴스는 재마운트 없이 유지).
  const [focusMode, setFocusMode] = useState(false);
  // 에디터가 올려주는 실시간 분량(단어·글자) — 목표·집중모드 카운터가 즉시 반영되도록.
  const [liveMeasure, setLiveMeasure] = useState<TextMeasure>(ZERO_MEASURE);
  const [unit] = useCountUnit();
  const liveWords = pickCount(liveMeasure, unit);
  // 스냅샷 복원 시 에디터를 강제 재마운트해 교체된 content를 다시 로드하는 토큰.
  const [reloadToken, setReloadToken] = useState(0);
  // 같은 문서를 다른 탭에서도 열었으면 경고(자동저장이 서로 덮어쓰는 사고 예방).
  const tabConflict = useTabGuard(selectedId);

  // 마지막에 열었던 문서를 우선 복원하고, 없으면 첫 DOC 자동 선택. 선택 문서가 사라지면 해제.
  useEffect(() => {
    if (selectedId && !documents.some((d) => d.id === selectedId)) {
      setSelectedId(null);
    }
    if (!selectedId) {
      const last = readLastDoc(id);
      const lastDoc = last ? documents.find((d) => d.id === last && d.type === "DOC") : null;
      const firstDoc = lastDoc ?? documents.find((d) => d.type === "DOC");
      if (firstDoc) setSelectedId(firstDoc.id);
    }
  }, [documents, selectedId, id]);

  useEffect(() => {
    if (selectedId) writeLastDoc(id, selectedId);
  }, [id, selectedId]);

  const selected = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId],
  );

  // 문서 전환 시 저장된 값으로 즉시 리셋(에디터 콜백이 곧 실시간 값으로 보정).
  useEffect(() => {
    const d = documents.find((x) => x.id === selectedId);
    setLiveMeasure(d ? measureDocument(d) : ZERO_MEASURE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // 집중 모드에서 ESC로 빠져나오기.
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  // 작품 전체 분량 = 저장된 합계에서 현재 편집 문서만 실시간 값으로 치환.
  const projectTotalWords = useMemo(() => {
    const base = sumDocCounts(documents, unit);
    if (!selected || selected.type !== "DOC") return base;
    return base - docCount(selected, unit) + liveWords;
  }, [documents, selected, liveWords, unit]);

  // 집중 모드 하단에 은은하게 띄울 문서 목표 진행률.
  const focusProgress = computeProgress(liveWords, selected?.goal);

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

  async function handleCreate(input: {
    title: string;
    type: "FOLDER" | "DOC";
    parentId: string | null;
  }) {
    // 바인더가 생성된 문서를 곧바로 인라인 이름 편집으로 열기 때문에 결과를 돌려준다.
    try {
      const doc = await createDocument(input);
      if (doc?.type === "DOC") setSelectedId(doc.id);
      return doc;
    } catch {
      toast("문서 생성에 실패했어요.", "error");
      return null;
    }
  }

  // 스냅샷 복원 완료 후: 문서 캐시 갱신 → selected.content 최신화 → 에디터 재마운트.
  async function handleRestored() {
    await mutateDocuments();
    setReloadToken((t) => t + 1);
  }

  async function handleMove(
    dragId: string,
    targetId: string,
    mode: "into" | "before",
  ) {
    const plan = planReorder(documents, dragId, targetId, mode);
    if (!plan) return; // 순환·무의미 이동은 무시
    try {
      if (plan.kind === "move") {
        await moveDocument(plan.id, plan.parentId, plan.order);
      } else {
        await reorderSiblings(plan.parentId, plan.orderedIds);
      }
    } catch {
      toast("이동에 실패했어요.", "error");
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 바 — 집중 모드에서는 숨김(에디터는 그대로 유지) */}
      {!focusMode && (
        <WorkspaceHeader
          projectTitle={project?.title}
          totalLabel={formatCount(projectTotalWords, unit)}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          openPanels={openPanels}
          onTogglePanel={(key) => panelSetters[key]((v) => !v)}
          onOpenPreview={() => setPreviewOpen(true)}
          previewDisabled={!selected || selected.type !== "DOC"}
          onOpenExport={() => setExportOpen(true)}
          onEnterFocus={() => setFocusMode(true)}
          onToggleBinder={() => setBinderOpen((v) => !v)}
          binderOpen={binderOpen}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {/* 좌: 바인더 — 집중 모드에서는 숨김(하지만 트리에 남겨 에디터 위치 유지 → 재마운트 방지) */}
        {/* 좁은 화면에서는 드로어(헤더 아래 고정) — 배경을 누르면 닫힌다 */}
        {binderOpen && !focusMode && (
          <button
            type="button"
            aria-label="바인더 닫기"
            onClick={() => setBinderOpen(false)}
            className="fixed inset-x-0 bottom-0 top-48 z-20 bg-black/30 md:hidden"
          />
        )}
        <aside
          className={cn(
            "w-[260px] shrink-0",
            "max-md:fixed max-md:bottom-0 max-md:left-0 max-md:top-48 max-md:z-30 max-md:w-[min(100vw,300px)] max-md:bg-bg max-md:shadow-lg",
            focusMode && "hidden",
            !binderOpen && "max-md:hidden",
          )}
        >
          <Binder
            projectId={id}
            documents={documents}
            selectedId={selectedId}
            onSelect={(docId) => {
              setSelectedId(docId);
              setBinderOpen(false); // 좁은 화면: 고르면 드로어를 닫고 본문으로
            }}
            onCreate={handleCreate}
            onRename={renameDocument}
            onDelete={deleteDocument}
            onMove={handleMove}
          />
        </aside>

        {/* 중: 에디터 */}
        <main className="relative min-w-0 flex-1 overflow-y-auto bg-bg">
          {tabConflict && <TabConflictBanner />}
          {isLoading && (
            <p className="p-24 text-body text-fg-weak">불러오는 중…</p>
          )}
          {error && (
            <p className="p-24 text-body text-error">문서를 불러오지 못했어요.</p>
          )}
          {!isLoading && !error && viewMode === "corkboard" && (
            <Corkboard
              documents={documents}
              selectedId={selectedId}
              onOpen={(docId) => {
                setSelectedId(docId);
                setViewMode("editor"); // 카드를 열면 곧바로 본문으로
              }}
              onUpdateSynopsis={updateSynopsis}
              onUpdateStatus={updateStatus}
              onMove={handleMove}
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
              projectId={id}
              initialContent={(selected.content as JSONContent | null) ?? null}
              title={selected.title}
              onMeasureChange={setLiveMeasure}
              onRename={(t) => renameDocument(selected.id, t)}
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

        {/* 우: 인스펙터 (기본 접힘) — 정보 / 스냅샷 탭. 집중 모드에서는 숨김 */}
        {inspectorOpen && !focusMode && (
          <aside className={cn(SIDE_PANEL, "w-[280px]")}>
            <div role="tablist" className="mb-12 flex gap-4">
              <button
                type="button"
                role="tab"
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
              <Inspector
                doc={selected}
                onSaveSynopsis={updateSynopsis}
                currentWords={liveWords}
                onSaveDocGoal={updateGoal}
                projectTotalWords={projectTotalWords}
                projectGoal={project?.goal}
                onSaveProjectGoal={updateProjectGoal}
              />
            )}
            {inspectorTab === "snapshots" &&
              (selected && selected.type === "DOC" ? (
                <SnapshotPanel doc={selected} onRestored={handleRestored} />
              ) : (
                <p className="text-body-sm text-fg-weak">
                  본문 문서를 선택하면 스냅샷을 저장할 수 있어요.
                </p>
              ))}
          </aside>
        )}

        {/* 우: 리서치 노트 (캐릭터·설정) — 바인더와 분리된 작품 단위 참고 자료 */}
        {notesOpen && !focusMode && (
          <aside className={cn(SIDE_PANEL, "w-[300px]")}>
            <NotesPanel projectId={id} />
          </aside>
        )}

        {/* 우: 타임라인(연표) — 사건 순서와 회차 연결 */}
        {timelineOpen && !focusMode && (
          <aside className={cn(SIDE_PANEL, "w-[320px]")}>
            <TimelinePanel
              projectId={id}
              documents={documents}
              onOpenDocument={(docId) => {
                setSelectedId(docId);
                setViewMode("editor");
              }}
            />
          </aside>
        )}

        {/* 우: 설정 점검 — 고유명사 사전·표기 흔들림·문장 리듬 */}
        {checkOpen && !focusMode && (
          <aside className={cn(SIDE_PANEL, "w-[320px]")}>
            <ConsistencyPanel
              projectId={id}
              documents={documents}
              selectedDoc={selected}
            />
          </aside>
        )}

        {/* 우: 집필 현황 — 오늘 분량·연속 집필일·최근 추이·회차별 분량 */}
        {statsOpen && !focusMode && (
          <aside className={cn(SIDE_PANEL, "w-[320px]")}>
            <StatsPanel
              projectId={id}
              documents={documents}
              dailyGoal={project?.dailyGoal}
              episodeGoal={project?.episodeGoal}
              projectGoal={project?.goal}
              projectWords={projectTotalWords}
              onSaveDailyGoal={updateDailyGoal}
              onSaveEpisodeGoal={updateEpisodeGoal}
              onSelectDocument={setSelectedId}
            />
          </aside>
        )}

        {/* 우: 검색 — 제목·본문 검색, 결과 클릭 시 문서 선택 */}
        {searchOpen && !focusMode && (
          <aside className={cn(SIDE_PANEL, "w-[300px] overflow-hidden")}>
            <SearchPanel
              documents={documents}
              onSelect={(docId) => {
                setSelectedId(docId);
                setSearchOpen(false);
              }}
            />
          </aside>
        )}

        {/* 우: 휴지통 — 소프트 삭제 문서 복원 / 영구 삭제 */}
        {trashOpen && !focusMode && (
          <aside className={cn(SIDE_PANEL, "w-[300px] overflow-hidden")}>
            <TrashPanel
              trashedDocuments={trashedDocuments}
              onRestore={async (docId) => {
                const node = trashedDocuments.find((d) => d.id === docId);
                try {
                  await restoreDocument(docId);
                  // 복원한 게 본문 문서면 바로 선택해 보여준다(폴더면 바인더에서 펼치도록 둔다).
                  if (node?.type === "DOC") setSelectedId(docId);
                } catch {
                  toast("복원에 실패했어요.", "error");
                }
              }}
              onPermanentDelete={async (docId) => {
                try {
                  await permanentlyDeleteDocument(docId);
                } catch {
                  toast("영구 삭제에 실패했어요.", "error");
                }
              }}
            />
          </aside>
        )}
      </div>

      {/* 독자 뷰 — 연재본처럼 보이는 현재 회차 미리보기 */}
      {selected && selected.type === "DOC" && (
        <ReaderPreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={selected.title}
          content={selected.content}
        />
      )}

      {/* 내보내기 — txt/마크다운, 현재 문서 또는 작품 전체를 브라우저 다운로드 */}
      <ExportMenu
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectTitle={project?.title ?? "작품"}
        documents={documents}
        selectedDoc={selected}
      />
    </div>
  );
}
