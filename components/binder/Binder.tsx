"use client";

import { useState } from "react";
import { Button, ConfirmModal, cn } from "@/components/ui";
import type { DocumentNode } from "@/hooks/types";

interface BinderProps {
  documents: DocumentNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (input: { title: string; type: "FOLDER" | "DOC"; parentId: string | null }) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

// 평면 배열(documents)을 parentId 기준 트리로 구성.
function buildTree(docs: DocumentNode[]) {
  const byParent = new Map<string | null, DocumentNode[]>();
  for (const d of docs) {
    const arr = byParent.get(d.parentId) ?? [];
    arr.push(d);
    byParent.set(d.parentId, arr);
  }
  for (const arr of byParent.values()) arr.sort((a, b) => a.order - b.order);
  return byParent;
}

export function Binder({
  documents,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: BinderProps) {
  const tree = buildTree(documents);
  const [deleteTarget, setDeleteTarget] = useState<DocumentNode | null>(null);

  const renderNodes = (parentId: string | null, depth: number) => {
    const nodes = tree.get(parentId) ?? [];
    return nodes.map((node) => (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-6 rounded-md px-8 py-6 text-body-sm",
            selectedId === node.id
              ? "bg-primary-weak text-primary"
              : "text-fg hover:bg-surface",
          )}
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          <button
            type="button"
            className="flex-1 truncate text-left"
            onClick={() => node.type === "DOC" && onSelect(node.id)}
            title={node.title}
          >
            <span className="mr-6 text-fg-muted">
              {node.type === "FOLDER" ? "📁" : "📄"}
            </span>
            {node.title}
          </button>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 text-caption text-fg-weak hover:text-fg"
            onClick={() => {
              const next = prompt("새 이름", node.title);
              if (next && next !== node.title) onRename(node.id, next);
            }}
            aria-label="이름 변경"
          >
            ✎
          </button>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 text-caption text-fg-weak hover:text-error"
            onClick={() => setDeleteTarget(node)}
            aria-label="삭제"
          >
            ✕
          </button>
        </div>
        {node.type === "FOLDER" && renderNodes(node.id, depth + 1)}
      </div>
    ));
  };

  return (
    <nav className="flex h-full flex-col border-r border-border bg-bg">
      <div className="flex items-center justify-between gap-6 border-b border-border px-12 py-10">
        <span className="text-caption font-medium text-fg-weak">바인더</span>
        <div className="flex gap-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const title = prompt("문서 제목");
              if (title) onCreate({ title, type: "DOC", parentId: null });
            }}
          >
            + 문서
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const title = prompt("폴더 이름");
              if (title) onCreate({ title, type: "FOLDER", parentId: null });
            }}
          >
            + 폴더
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {documents.length === 0 ? (
          <div className="px-8 py-24 text-center text-body-sm text-fg-weak">
            아직 문서가 없어요.
            <br />
            위의 <b>+ 문서</b>로 첫 글을 시작하세요.
          </div>
        ) : (
          renderNodes(null, 0)
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={`'${deleteTarget?.title}' 삭제`}
        description={
          deleteTarget?.type === "FOLDER"
            ? "폴더와 하위 문서가 모두 삭제됩니다. 되돌릴 수 없습니다."
            : "문서가 삭제됩니다. 되돌릴 수 없습니다."
        }
        danger
        confirmText="삭제"
      />
    </nav>
  );
}
