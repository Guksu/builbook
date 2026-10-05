"use client";

import { useState } from "react";
import { ConfirmModal, cn } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { selectTrashRoots } from "@entities/document";

interface TrashSectionProps {
  // 휴지통 문서 전체(useDocuments.trashedDocuments). 루트 선별은 내부에서.
  trashedDocuments: DocumentNode[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

/**
 * 바인더 맨 아래의 휴지통 — 접힌 한 줄("휴지통 · N")을 누르면 펼쳐져 복원·영구 삭제를 한다.
 * 휴지통은 바인더 문서를 다루는 기능이라 상단 바 패널 메뉴가 아니라 바인더 안에 둔다(2026-10,
 * 스크리브너·옵시디언의 바인더 휴지통과 같은 자리).
 */
export function TrashSection({
  trashedDocuments,
  onRestore,
  onPermanentDelete,
}: TrashSectionProps) {
  const roots = selectTrashRoots(trashedDocuments);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentNode | null>(null);

  return (
    <section aria-label="휴지통" className="shrink-0 border-r border-t border-border bg-bg">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "휴지통 접기" : "휴지통 펼치기"}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-6 px-12 py-8 text-caption text-fg-weak transition-colors hover:bg-surface hover:text-fg"
      >
        <span aria-hidden className={cn("transition-transform", open && "rotate-90")}>
          ›
        </span>
        <span className="font-medium">휴지통</span>
        {roots.length > 0 && <span className="tabular-nums text-fg-muted">{roots.length}</span>}
      </button>

      {open && (
        <div className="max-h-[40vh] overflow-y-auto px-4 pb-8">
          {roots.length === 0 ? (
            <p className="px-8 py-8 text-body-sm text-fg-weak">
              휴지통이 비어 있어요.
              <br />
              삭제한 문서를 여기서 되살릴 수 있어요.
            </p>
          ) : (
            <ul aria-label="휴지통 목록" className="flex flex-col gap-2">
              {roots.map((node) => (
                <li
                  key={node.id}
                  className="flex items-center gap-6 rounded-md px-8 py-6 hover:bg-surface"
                >
                  <span className="text-fg-muted" aria-hidden>
                    {node.type === "FOLDER" ? "📁" : "📄"}
                  </span>
                  <span className="flex-1 truncate text-body-sm text-fg" title={node.title}>
                    {node.title}
                  </span>
                  <button
                    type="button"
                    className="text-caption text-fg-weak hover:text-primary"
                    onClick={() => onRestore(node.id)}
                  >
                    복원
                  </button>
                  <button
                    type="button"
                    className="text-caption text-fg-weak hover:text-error"
                    onClick={() => setDeleteTarget(node)}
                  >
                    영구 삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onPermanentDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={`'${deleteTarget?.title}' 영구 삭제`}
        description={
          deleteTarget?.type === "FOLDER"
            ? "폴더와 하위 문서가 완전히 삭제됩니다. 되돌릴 수 없습니다."
            : "문서가 완전히 삭제됩니다. 되돌릴 수 없습니다."
        }
        danger
        confirmText="영구 삭제"
      />
    </section>
  );
}
