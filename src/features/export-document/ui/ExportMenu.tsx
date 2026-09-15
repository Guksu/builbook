"use client";

import { useState } from "react";

import { Modal, Button } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import {
  safeFileName,
  documentToPlainText,
  documentToMarkdown,
  projectToPlainText,
  projectToMarkdown,
} from "../lib/exportDocuments";
import { downloadBlob, downloadTextFile, type ExportFormat } from "../lib/download";


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
  const [docxError, setDocxError] = useState<string | null>(null);
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

  // DOCX는 비동기(zip 패킹). docx 패키지는 무거워서 버튼을 눌렀을 때만 불러온다(작업실 첫 로드 보호).
  // 실패해도 모달만 남겨 다시 시도할 수 있게 한다.
  async function exportDocx(scope: "doc" | "project") {
    try {
      const { buildDocx, documentToSections, packDocxBlob, projectToSections } = await import(
        "../lib/docx"
      );
      const sections =
        scope === "doc"
          ? selectedDoc && documentToSections(selectedDoc)
          : projectToSections(projectTitle, documents);
      if (!sections) return;
      const name = safeFileName(scope === "doc" ? selectedDoc!.title : projectTitle);
      downloadBlob(`${name}.docx`, await packDocxBlob(buildDocx(sections)));
      onClose();
    } catch {
      setDocxError("DOCX 파일을 만들지 못했어요. TXT로 내보내 보세요.");
    }
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
      description="브라우저에 파일로 저장합니다. DOCX는 투고·플랫폼 업로드용, TXT는 어디서나 열려요."
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
            <Button
              size="sm"
              variant="secondary"
              disabled={!canExportDoc}
              onClick={() => void exportDocx("doc")}
            >
              DOCX
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
            <Button
              size="sm"
              variant="secondary"
              disabled={documents.length === 0}
              onClick={() => void exportDocx("project")}
            >
              DOCX
            </Button>
          </div>
          {docxError && <p className="text-caption text-error">{docxError}</p>}
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
