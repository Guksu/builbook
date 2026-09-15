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
import { DEFAULT_COMPILE, countEpisodes, type CompileOptions, type EpisodeSeparator } from "../lib/compile";
import { addPreset, removePreset } from "../lib/presets";
import type { CompilePreset } from "@entities/project";


interface ExportMenuProps {
  open: boolean;
  onClose: () => void;
  projectTitle: string;
  // 정상 문서 목록(휴지통 제외). 작품 전체 내보내기에 사용.
  documents: DocumentNode[];
  // 현재 선택된 본문 문서(없거나 폴더면 '현재 문서' 내보내기 비활성).
  selectedDoc: DocumentNode | null;
  /** 작품에 저장된 컴파일 프리셋. */
  presets?: CompilePreset[];
  onSavePresets?: (presets: CompilePreset[]) => void;
}

export function ExportMenu({
  open,
  onClose,
  projectTitle,
  documents,
  selectedDoc,
  presets = [],
  onSavePresets,
}: ExportMenuProps) {
  const [presetName, setPresetName] = useState("");
  const [presetId, setPresetId] = useState("");
  const [docxError, setDocxError] = useState<string | null>(null);
  // 컴파일 옵션(작품 전체에만 적용). 모달이 열려 있는 동안만 유지 — 매번 같은 기본값에서 시작한다.
  const [opts, setOpts] = useState<CompileOptions>(DEFAULT_COMPILE);
  const episodeTotal = countEpisodes(documents);
  const patch = (p: Partial<CompileOptions>) => setOpts((o) => ({ ...o, ...p }));
  const parseNo = (v: string) => {
    const n = Number(v);
    return v.trim() === "" || !Number.isFinite(n) ? null : Math.floor(n);
  };
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
          : projectToSections(projectTitle, documents, opts);
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
        ? projectToPlainText(projectTitle, documents, opts)
        : projectToMarkdown(projectTitle, documents, opts);
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
          {/* 컴파일 옵션 — 스크리브너 Compile의 핵심만: 범위·구분선·제목 */}
          <div className="flex flex-col gap-6 rounded-md border border-border bg-surface p-12 text-body-sm">
            {onSavePresets && (
              <div className="flex flex-wrap items-center gap-8">
                <label htmlFor="compile-preset" className="text-fg-weak">
                  프리셋
                </label>
                <select
                  id="compile-preset"
                  aria-label="컴파일 프리셋"
                  value={presetId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPresetId(id);
                    const p = presets.find((x) => x.id === id);
                    if (p) setOpts({ ...p.options });
                  }}
                  className="h-28 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
                >
                  <option value="">선택 안 함</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {presetId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onSavePresets(removePreset(presets, presetId));
                      setPresetId("");
                    }}
                  >
                    프리셋 삭제
                  </Button>
                )}
                <input
                  aria-label="프리셋 이름"
                  placeholder="현재 옵션을 이름 붙여 저장"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="h-28 min-w-0 flex-1 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!presetName.trim()}
                  onClick={() => {
                    const next = addPreset(presets, presetName, opts, crypto.randomUUID());
                    onSavePresets(next);
                    setPresetId(next[next.length - 1].id);
                    setPresetName("");
                  }}
                >
                  프리셋 저장
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-8">
              <span className="text-fg-weak">회차 범위</span>
              <input
                type="number"
                min={1}
                max={episodeTotal || 1}
                aria-label="시작 회차"
                placeholder="처음"
                value={opts.fromEpisode ?? ""}
                onChange={(e) => patch({ fromEpisode: parseNo(e.target.value) })}
                className="h-28 w-64 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
              />
              <span className="text-fg-weak">~</span>
              <input
                type="number"
                min={1}
                max={episodeTotal || 1}
                aria-label="끝 회차"
                placeholder="끝"
                value={opts.toEpisode ?? ""}
                onChange={(e) => patch({ toEpisode: parseNo(e.target.value) })}
                className="h-28 w-64 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
              />
              <span className="text-caption text-fg-weak">전체 {episodeTotal}회차</span>
            </div>
            <div className="flex flex-wrap items-center gap-8">
              <label htmlFor="episode-separator" className="text-fg-weak">
                회차 구분
              </label>
              <select
                id="episode-separator"
                aria-label="회차 구분"
                value={opts.separator}
                onChange={(e) => patch({ separator: e.target.value as EpisodeSeparator })}
                className="h-28 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
              >
                <option value="none">없음</option>
                <option value="blank">빈 줄</option>
                <option value="stars">* * *</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-12">
              {(
                [
                  ["includeTitles", "회차 제목"],
                  ["includeFolders", "폴더 제목"],
                  ["includeProjectTitle", "작품 제목"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-4 text-fg">
                  <input
                    type="checkbox"
                    aria-label={`${label} 포함`}
                    checked={opts[key]}
                    onChange={(e) => patch({ [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
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
