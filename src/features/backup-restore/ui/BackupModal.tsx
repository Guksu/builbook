"use client";

import { useRef, useState } from "react";
import { Button, Modal, useToast, cn } from "@shared/ui";
import { describeSummary, type BackupFile, type ImportMode } from "../lib/backup";
import { readTextFile } from "../lib/backupFile";
import { useBackup } from "../model/useBackup";

export interface BackupModalProps {
  open: boolean;
  onClose: () => void;
  /** 백업 권유 문구 판정용 — 작품이 0개면 배너/경고를 띄우지 않는다. */
  projectCount: number;
}

const MODE_LABEL: Record<ImportMode, string> = {
  merge: "합치기 (안전)",
  replace: "전체 교체 (위험)",
};

/**
 * 백업·복원 한 화면. 내보내기는 버튼 한 번, 복원은 "파일 선택 → 내용 확인 → 실행" 3단계로
 * 나눈다 — 원고를 덮어쓸 수 있는 동작이라 무엇이 들어오는지 먼저 보여준 뒤 실행한다.
 */
export function BackupModal({ open, onClose, projectCount }: BackupModalProps) {
  const { toast } = useToast();
  const { status, busy, exportBackup, inspect, importBackup } = useBackup(projectCount);
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<BackupFile | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [agreed, setAgreed] = useState(false);

  function resetPick() {
    setPicked(null);
    setPickError(null);
    setMode("merge");
    setAgreed(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleExport() {
    try {
      const result = await exportBackup();
      const { projects, documents, snapshots, notes } = result.counts;
      toast(
        `백업 파일을 저장했어요 — 작품 ${projects} · 문서 ${documents} · 스냅샷 ${snapshots} · 노트 ${notes}`,
        "success",
      );
    } catch {
      toast("백업 파일을 만들지 못했어요.", "error");
    }
  }

  async function handlePick(file: File | undefined) {
    if (!file) return;
    setPicked(null);
    try {
      const text = await readTextFile(file);
      const parsed = inspect(text);
      if (!parsed.ok) {
        setPickError(parsed.error);
        return;
      }
      setPickError(null);
      setPicked(parsed.file);
    } catch {
      setPickError("파일을 읽지 못했어요.");
    }
  }

  async function handleImport() {
    if (!picked) return;
    const result = await importBackup(picked, mode);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(describeSummary(result.summary), "success");
    resetPick();
    onClose();
  }

  const counts = picked?.counts;
  const canImport = !!picked && !busy && (mode === "merge" || agreed);

  return (
    <Modal
      open={open}
      onClose={() => {
        resetPick();
        onClose();
      }}
      title="백업 · 복원"
      description="원고는 이 브라우저에만 저장돼요. 파일 하나로 통째로 내보내고 되돌릴 수 있어요."
      className="max-w-[560px]"
      footer={
        <Button
          variant="ghost"
          onClick={() => {
            resetPick();
            onClose();
          }}
        >
          닫기
        </Button>
      }
    >
      <section className="mb-24">
        <h3 className="mb-4 text-body font-medium text-fg">백업 파일 만들기</h3>
        <p className="mb-12 text-body-sm text-fg-weak">
          작품·문서·스냅샷·리서치 노트 전부를 JSON 파일 하나로 저장해요.
          {status && status.level !== "empty" && (
            <span className={cn("ml-4", status.level === "ok" ? "text-fg-weak" : "text-error")}>
              {status.message}
            </span>
          )}
        </p>
        <Button onClick={handleExport} disabled={busy}>
          지금 백업하기
        </Button>
      </section>

      <section className="border-t border-border pt-16">
        <h3 className="mb-4 text-body font-medium text-fg">백업에서 복원하기</h3>
        <p className="mb-12 text-body-sm text-fg-weak">
          내보낸 JSON 파일을 선택하면 내용을 먼저 확인한 뒤 복원해요.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label="백업 파일 선택"
          className="block w-full text-body-sm text-fg-weak file:mr-12 file:h-32 file:rounded-md file:border file:border-border file:bg-surface file:px-12 file:text-body-sm file:text-fg"
          onChange={(e) => handlePick(e.target.files?.[0])}
        />

        {pickError && <p className="mt-12 text-body-sm text-error">{pickError}</p>}

        {picked && counts && (
          <div className="mt-16 rounded-md border border-border bg-surface p-12">
            <p className="text-body-sm text-fg">
              {picked.exportedAt
                ? `${new Date(picked.exportedAt).toLocaleString("ko-KR")} 백업`
                : "시각 정보 없는 백업"}
            </p>
            <p className="mt-4 text-caption text-fg-weak">
              작품 {counts.projects} · 문서 {counts.documents} · 스냅샷 {counts.snapshots} · 노트{" "}
              {counts.notes}
            </p>

            <div className="mt-12 flex flex-col gap-6">
              {(["merge", "replace"] as ImportMode[]).map((m) => (
                <label key={m} className="flex items-start gap-8 text-body-sm text-fg">
                  <input
                    type="radio"
                    name="import-mode"
                    className="mt-4"
                    checked={mode === m}
                    onChange={() => {
                      setMode(m);
                      setAgreed(false);
                    }}
                  />
                  <span>
                    {MODE_LABEL[m]}
                    <span className="ml-6 text-caption text-fg-weak">
                      {m === "merge"
                        ? "지금 데이터를 그대로 두고 백업을 얹어요. 같은 글은 더 최근에 고친 쪽이 남아요."
                        : "지금 브라우저의 모든 작품을 지우고 백업 내용만 남겨요."}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {mode === "replace" && (
              <label className="mt-12 flex items-center gap-8 text-body-sm text-error">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                지금 브라우저의 원고가 지워지는 데 동의해요.
              </label>
            )}

            <div className="mt-16 flex gap-8">
              <Button onClick={handleImport} disabled={!canImport} variant={mode === "replace" ? "danger" : "primary"}>
                {busy ? "복원 중…" : "복원 실행"}
              </Button>
              <Button variant="ghost" onClick={resetPick} disabled={busy}>
                파일 다시 고르기
              </Button>
            </div>
          </div>
        )}
      </section>
    </Modal>
  );
}
