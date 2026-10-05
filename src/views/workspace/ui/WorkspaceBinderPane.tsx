"use client";

// 작업실 좌측 바인더 자리. 넓은 화면에서는 고정 폭 사이드바,
// 좁은 화면(md 미만)에서는 헤더 아래 드로어 + 배경 버튼으로 동작한다.

import { Binder } from "@widgets/binder";
import { TrashSection } from "@features/trash-document";
import type { DocumentKind, DocumentNode } from "@entities/document";
import { cn, useToast } from "@shared/ui";
import type { DocumentsApi, ProjectApi } from "../model/types";
import type { WorkspacePanels } from "../model/useWorkspacePanels";
import type { WorkspaceSelection } from "../model/useWorkspaceSelection";

interface WorkspaceBinderPaneProps {
  projectId: string;
  documents: DocumentNode[];
  selection: WorkspaceSelection;
  panels: WorkspacePanels;
  docs: DocumentsApi;
  project: ProjectApi["project"];
  onCreate: (input: {
    title: string;
    type: "FOLDER" | "DOC";
    parentId: string | null;
    content?: unknown;
    kind?: DocumentKind;
  }) => Promise<DocumentNode | null>;
  onMove: (dragId: string, targetId: string, mode: "into" | "before") => void | Promise<void>;
  onMoveToParent: (docId: string, parentId: string | null) => void | Promise<void>;
  onMoveManyToParent: (ids: string[], parentId: string | null) => void | Promise<void>;
}

export function WorkspaceBinderPane({
  projectId,
  documents,
  selection,
  panels,
  docs,
  project,
  onCreate,
  onMove,
  onMoveToParent,
  onMoveManyToParent,
}: WorkspaceBinderPaneProps) {
  const { selectedId, setSelectedId } = selection;
  const { binderOpen, setBinderOpen, focusMode } = panels;
  const { toast } = useToast();

  // 휴지통으로 보낸 직후 6초 동안 "되돌리기" — 실수 삭제를 확인창 없이도 만회할 수 있게.
  async function handleDelete(id: string) {
    const title = documents.find((d) => d.id === id)?.title ?? "문서";
    await docs.deleteDocument(id);
    toast(`'${title}'을(를) 휴지통으로 보냈어요.`, "default", {
      label: "되돌리기",
      onClick: () => void docs.restoreDocument(id),
    });
  }
  async function handleRestore(id: string) {
    const node = docs.trashedDocuments.find((d) => d.id === id);
    try {
      await docs.restoreDocument(id);
      // 복원한 게 본문 문서면 바로 선택해 보여준다(폴더면 바인더에서 펼치도록 둔다).
      if (node?.type === "DOC") setSelectedId(id);
    } catch {
      toast("복원에 실패했어요.", "error");
    }
  }
  async function handlePermanentDelete(id: string) {
    try {
      await docs.permanentlyDeleteDocument(id);
    } catch {
      toast("영구 삭제에 실패했어요.", "error");
    }
  }
  async function handleDeleteMany(ids: string[]) {
    await docs.deleteDocuments(ids);
    toast(`${ids.length}개 항목을 휴지통으로 보냈어요.`, "default", {
      label: "되돌리기",
      onClick: () => {
        void (async () => {
          for (const id of ids) await docs.restoreDocument(id);
        })();
      },
    });
  }

  return (
    <>
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
          "flex w-[260px] shrink-0 flex-col",
          "max-md:fixed max-md:bottom-0 max-md:left-0 max-md:top-48 max-md:z-30 max-md:w-[min(100vw,300px)] max-md:bg-bg max-md:shadow-lg",
          focusMode && "hidden",
          !binderOpen && "max-md:hidden",
        )}
      >
        <div className="min-h-0 flex-1">
        <Binder
          projectId={projectId}
          documents={documents}
          selectedId={selectedId}
          onSelect={(docId) => {
            setSelectedId(docId);
            setBinderOpen(false); // 좁은 화면: 고르면 드로어를 닫고 본문으로
          }}
          onCreate={onCreate}
          onRename={docs.renameDocument}
          onDelete={handleDelete}
          onDeleteMany={handleDeleteMany}
          onMove={onMove}
          onMoveToParent={onMoveToParent}
          onMoveManyToParent={onMoveManyToParent}
          labels={project?.labels}
        />
        </div>
        {/* 바인더 맨 아래: 휴지통(접힌 한 줄 → 펼치면 복원·영구 삭제) */}
        <TrashSection
          trashedDocuments={docs.trashedDocuments}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      </aside>
    </>
  );
}
