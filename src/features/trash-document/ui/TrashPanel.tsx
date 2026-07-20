"use client";

import { useState } from "react";
import { ConfirmModal } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { selectTrashRoots } from "@entities/document";

interface TrashPanelProps {
  // 휴지통 문서 전체(useDocuments.trashedDocuments). 루트 선별은 내부에서.
  trashedDocuments: DocumentNode[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export function TrashPanel({
  trashedDocuments,
  onRestore,
  onPermanentDelete,
}: TrashPanelProps) {
  const roots = selectTrashRoots(trashedDocuments);
  const [deleteTarget, setDeleteTarget] = useState<DocumentNode | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-12 flex items-center justify-between">
        <span className="text-caption font-medium text-fg-weak">휴지통</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {roots.length === 0 ? (
          <p className="px-4 py-16 text-body-sm text-fg-weak">
            휴지통이 비어 있어요.
            <br />
            삭제한 문서를 여기서 되살릴 수 있어요.
          </p>
        ) : (
          <ul aria-label="휴지통 목록" className="flex flex-col gap-2">
            {roots.map((node) => (
              <li
                key={node.id}
                className="flex items-center gap-6 rounded-md px-8 py-8 hover:bg-surface"
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
    </div>
  );
}
