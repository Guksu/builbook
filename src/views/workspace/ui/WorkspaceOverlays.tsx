"use client";

// 작업실 전체 위에 뜨는 오버레이 묶음 — 독자 뷰 미리보기 · 내보내기 · 빠른 열기.
// 본문/패널 레이아웃 밖에 있어 어느 화면에서든 같은 자리에서 열린다.

import type { Dispatch, SetStateAction } from "react";
import { QuickOpen } from "@features/quick-open";
import { ExportMenu } from "@features/export-document";
import { ReaderPreview } from "@features/reader-preview";
import type { DocumentNode } from "@entities/document";
import type { ProjectApi } from "../model/types";
import type { WorkspacePanels } from "../model/useWorkspacePanels";
import type { WorkspaceSelection } from "../model/useWorkspaceSelection";

interface WorkspaceOverlaysProps {
  documents: DocumentNode[];
  selection: WorkspaceSelection;
  panels: WorkspacePanels;
  projectApi: ProjectApi;
  quickOpen: boolean;
  setQuickOpen: Dispatch<SetStateAction<boolean>>;
}

export function WorkspaceOverlays({
  documents,
  selection,
  panels,
  projectApi,
  quickOpen,
  setQuickOpen,
}: WorkspaceOverlaysProps) {
  const { selected, setSelectedId } = selection;
  const { project } = projectApi;

  return (
    <>
      {/* 독자 뷰 — 연재본처럼 보이는 현재 회차 미리보기 */}
      {selected && selected.type === "DOC" && (
        <ReaderPreview
          open={panels.previewOpen}
          onClose={() => panels.setPreviewOpen(false)}
          title={selected.title}
          content={selected.content}
        />
      )}

      {/* 내보내기 — txt/마크다운, 현재 문서 또는 작품 전체를 브라우저 다운로드 */}
      <ExportMenu
        open={panels.exportOpen}
        onClose={() => panels.setExportOpen(false)}
        projectTitle={project?.title ?? "작품"}
        documents={documents}
        selectedDoc={selected}
        presets={project?.compilePresets}
        onSavePresets={projectApi.updateCompilePresets}
      />
      <QuickOpen
        open={quickOpen}
        documents={documents}
        onClose={() => setQuickOpen(false)}
        onPick={(d) => {
          setSelectedId(d.id);
          panels.setViewMode("editor");
        }}
      />
    </>
  );
}
