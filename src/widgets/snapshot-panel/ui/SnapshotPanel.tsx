"use client";

import { useMemo, useState } from "react";
import { Button, Modal, ConfirmModal, Input, useToast } from "@shared/ui";
import {
  useSnapshots,
  getSnapshot,
  type Snapshot,
} from "@entities/snapshot";
import { saveDocumentContent, type DocumentNode } from "@entities/document";
import { buildPreview, formatSignedDiff } from "@features/snapshot-document";
import { extractPlainText, countChars } from "@shared/lib";

interface SnapshotPanelProps {
  /** 현재 선택된 DOC 문서 */
  doc: DocumentNode;
  /** 복원으로 문서 content가 교체된 뒤 호출 — 상위가 목록 캐시 갱신 + 에디터 재로드 */
  onRestored: () => void | Promise<void>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 인스펙터의 '스냅샷' 탭 본체: 저장 · 목록 · 미리보기/비교 · 복원 · 삭제.
export function SnapshotPanel({ doc, onRestored }: SnapshotPanelProps) {
  const { toast } = useToast();
  const { snapshots, isLoading, createSnapshot, deleteSnapshot, mutate } =
    useSnapshots(doc.id);

  const [saveOpen, setSaveOpen] = useState(false);
  const [note, setNote] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  // 현재 문서의 글자 수(공백 제외) — 각 스냅샷과의 차이 계산 기준.
  const currentChars = useMemo(
    () => countChars(extractPlainText(doc.content)),
    [doc.content],
  );

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    try {
      await createSnapshot({
        documentId: doc.id,
        projectId: doc.projectId,
        title: doc.title,
        content: doc.content,
        wordCount: doc.wordCount,
        note: note.trim() || null,
      });
      setSaveOpen(false);
      setNote("");
      toast("스냅샷을 저장했어요.", "success");
    } catch {
      toast("스냅샷 저장에 실패했어요.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(target: Snapshot) {
    if (busy) return;
    setBusy(true);
    try {
      // 목록 캐시가 stale일 수 있어 신선하게 다시 읽는다.
      const fresh = (await getSnapshot(target.id)) ?? target;
      // 실수 방지: 복원 직전 현재 상태를 자동 스냅샷으로 남긴다.
      await createSnapshot({
        documentId: doc.id,
        projectId: doc.projectId,
        title: doc.title,
        content: doc.content,
        wordCount: doc.wordCount,
        note: "복원 전 자동 저장",
      });
      // 문서 content를 스냅샷으로 교체(제목은 유지).
      await saveDocumentContent(doc.id, fresh.content, fresh.wordCount);
      await mutate();
      await onRestored();
      toast("스냅샷으로 복원했어요.", "success");
    } catch {
      toast("복원에 실패했어요.", "error");
    } finally {
      setBusy(false);
      setRestoreTarget(null);
    }
  }

  async function handleDelete(target: Snapshot) {
    try {
      await deleteSnapshot(target.id);
    } catch {
      toast("스냅샷 삭제에 실패했어요.", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setSaveOpen(true)}
      >
        스냅샷 저장
      </Button>

      {isLoading && <p className="text-body-sm text-fg-weak">불러오는 중…</p>}

      {!isLoading && snapshots.length === 0 && (
        <p className="text-body-sm text-fg-weak">
          아직 스냅샷이 없어요. 중요한 순간마다 저장해 두면 언제든 되돌릴 수 있어요.
        </p>
      )}

      <ul aria-label="스냅샷 목록" className="flex flex-col gap-8">
        {snapshots.map((snap) => {
          const open = expandedId === snap.id;
          const diff = currentChars - countChars(extractPlainText(snap.content));
          return (
            <li
              key={snap.id}
              className="rounded-lg border border-border bg-bg p-12"
            >
              <button
                type="button"
                className="flex w-full flex-col items-start gap-2 text-left"
                onClick={() => setExpandedId(open ? null : snap.id)}
                aria-expanded={open}
              >
                <span className="text-body-sm text-fg">
                  {formatTime(snap.createdAt)}
                </span>
                {snap.note && (
                  <span className="text-caption text-fg-weak">{snap.note}</span>
                )}
                <span className="text-caption tabular-nums text-fg-weak">
                  {snap.wordCount.toLocaleString("ko-KR")}단어
                </span>
              </button>

              {open && (
                <div className="mt-8 flex flex-col gap-8">
                  <p className="rounded-md bg-surface p-8 text-caption leading-relaxed text-fg-weak">
                    {buildPreview(snap.content, 200)}
                  </p>
                  <p className="text-caption tabular-nums text-fg-weak">
                    현재 문서 대비{" "}
                    <span className="text-fg">{formatSignedDiff(diff)}자</span>
                  </p>
                  <div className="flex gap-8">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={busy}
                      onClick={() => setRestoreTarget(snap)}
                    >
                      복원
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setDeleteTarget(snap)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* 스냅샷 저장 — 메모는 선택(빈 값 저장 허용) */}
      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="스냅샷 저장"
        description="지금 문서 상태를 버전으로 남겨요. 메모는 선택이에요."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={busy}>
              저장
            </Button>
          </>
        }
      >
        <label
          htmlFor="snapshot-note"
          className="mb-6 block text-body-sm text-fg-weak"
        >
          메모 (선택)
        </label>
        <Input
          id="snapshot-note"
          autoFocus
          placeholder="예: 결말 갈아엎기 전"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) void handleSave();
          }}
        />
      </Modal>

      {/* 복원 확인 — 되돌리기 전에 현재 상태를 자동 스냅샷으로 남김 안내 */}
      <ConfirmModal
        open={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => restoreTarget && void handleRestore(restoreTarget)}
        title="스냅샷 복원"
        description="현재 본문을 이 스냅샷으로 되돌려요. 되돌리기 직전 상태는 자동 스냅샷으로 남겨두니 안심하세요."
        confirmText="복원"
      />

      {/* 삭제 확인 */}
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && void handleDelete(deleteTarget)}
        title="스냅샷 삭제"
        description="이 스냅샷을 영구 삭제해요. 되돌릴 수 없어요."
        confirmText="삭제"
        danger
      />
    </div>
  );
}
