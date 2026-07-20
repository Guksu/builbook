"use client";

import { Modal, Button } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import {
  safeFileName,
  documentToPlainText,
  documentToMarkdown,
  projectToPlainText,
  projectToMarkdown,
} from "../lib/exportDocuments";
import { downloadTextFile, type ExportFormat } from "../lib/download";

interface ExportMenuProps {
  open: boolean;
  onClose: () => void;
  projectTitle: string;
  // 정상 문서 목록(휴지통 제외). 작품 전체 내보내기에 사용.
  documents: DocumentNode[];
  // 현재 선택된 본문 문서(없거나 폴더면 '현재 문서' 내보내기 비활성).
  selectedDoc: DocumentNode | null;
}

export function ExportMenu({
  open,
  onClose,
  projectTitle,
  documents,
  selectedDoc,
}: ExportMenuProps) {
  const canExportDoc = !!selectedDoc && selectedDoc.type === "DOC";

  function exportDoc(format: ExportFormat) {
    if (!selectedDoc) return;
    const content =
      format === "txt"
        ? documentToPlainText(selectedDoc)
        : documentToMarkdown(selectedDoc);
    downloadTextFile(safeFileName(selectedDoc.title), format, content);
    onClose();
  }

  function exportProject(format: ExportFormat) {
    const content =
      format === "txt"
        ? projectToPlainText(projectTitle, documents)
        : projectToMarkdown(projectTitle, documents);
    downloadTextFile(safeFileName(projectTitle), format, content);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="내보내기"
      description="브라우저에 파일로 저장합니다."
    >
      <div className="flex flex-col gap-16">
        <section className="flex flex-col gap-8">
          <span className="text-body-sm font-medium text-fg">현재 문서</span>
          <div className="flex gap-8">
            <Button
              size="sm"
              variant="secondary"
              disabled={!canExportDoc}
              onClick={() => exportDoc("txt")}
            >
              TXT
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!canExportDoc}
              onClick={() => exportDoc("md")}
            >
              마크다운
            </Button>
          </div>
          {!canExportDoc && (
            <p className="text-caption text-fg-weak">
              본문 문서를 선택하면 개별 내보내기가 가능해요.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-8">
          <span className="text-body-sm font-medium text-fg">작품 전체</span>
          <div className="flex gap-8">
            <Button
              size="sm"
              variant="secondary"
              disabled={documents.length === 0}
              onClick={() => exportProject("txt")}
            >
              TXT
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={documents.length === 0}
              onClick={() => exportProject("md")}
            >
              마크다운
            </Button>
          </div>
          {documents.length === 0 && (
            <p className="text-caption text-fg-weak">
              내보낼 문서가 아직 없어요.
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
