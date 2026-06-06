"use client";

import { useState } from "react";
import { Button, ConfirmModal, PromptModal, cn } from "@shared/ui";
import type { DocumentNode } from "@entities/document";

// 네이티브 prompt() 대신 인앱 입력 다이얼로그로 처리할 작업 종류.
type PromptState =
  | { kind: "rename"; node: DocumentNode }
  | { kind: "new-doc" }
  | { kind: "new-folder" }
  | null;

const PROMPT_COPY = {
  rename: { title: "이름 변경", label: "새 이름", confirm: "변경" },
  "new-doc": { title: "새 문서", label: "문서 제목", confirm: "만들기" },
  "new-folder": { title: "새 폴더", label: "폴더 이름", confirm: "만들기" },
} as const;

interface BinderProps {
  documents: DocumentNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (input: { title: string; type: "FOLDER" | "DOC"; parentId: string | null }) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  // 드래그 재정렬: 폴더 위 드롭=into(안으로), 문서 위 드롭=before(앞에).
  onMove?: (dragId: string, targetId: string, mode: "into" | "before") => void;
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
  onMove,
}: BinderProps) {
  const tree = buildTree(documents);
  const [deleteTarget, setDeleteTarget] = useState<DocumentNode | null>(null);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    mode: "into" | "before";
  } | null>(null);

  const renderNodes = (parentId: string | null, depth: number) => {
    const nodes = tree.get(parentId) ?? [];
    return nodes.map((node) => (
      <div key={node.id}>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", node.id);
            e.dataTransfer.effectAllowed = "move";
            setDragId(node.id);
          }}
          onDragEnd={() => {
            setDragId(null);
            setDropTarget(null);
          }}
          onDragOver={(e) => {
            if (!dragId || dragId === node.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropTarget({
              id: node.id,
              mode: node.type === "FOLDER" ? "into" : "before",
            });
          }}
          onDragLeave={() =>
            setDropTarget((t) => (t?.id === node.id ? null : t))
          }
          onDrop={(e) => {
            e.preventDefault();
            const dragged = e.dataTransfer.getData("text/plain") || dragId;
            const mode = node.type === "FOLDER" ? "into" : "before";
            if (dragged && dragged !== node.id) onMove?.(dragged, node.id, mode);
            setDropTarget(null);
            setDragId(null);
          }}
          className={cn(
            "group flex cursor-grab items-center gap-6 rounded-md px-8 py-6 text-body-sm active:cursor-grabbing",
            selectedId === node.id
              ? "bg-primary-weak text-primary"
              : "text-fg hover:bg-surface",
            dragId === node.id && "opacity-50",
            dropTarget?.id === node.id &&
              (dropTarget.mode === "into"
                ? "ring-2 ring-inset ring-primary"
                : "border-t-2 border-primary"),
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
            onClick={() => setPrompt({ kind: "rename", node })}
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
            onClick={() => setPrompt({ kind: "new-doc" })}
          >
            + 문서
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPrompt({ kind: "new-folder" })}
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

      <PromptModal
        open={!!prompt}
        onClose={() => setPrompt(null)}
        title={prompt ? PROMPT_COPY[prompt.kind].title : ""}
        label={prompt ? PROMPT_COPY[prompt.kind].label : undefined}
        confirmText={prompt ? PROMPT_COPY[prompt.kind].confirm : undefined}
        initialValue={prompt?.kind === "rename" ? prompt.node.title : ""}
        onSubmit={(value) => {
          if (!prompt) return;
          if (prompt.kind === "rename") {
            if (value !== prompt.node.title) onRename(prompt.node.id, value);
          } else if (prompt.kind === "new-doc") {
            onCreate({ title: value, type: "DOC", parentId: null });
          } else {
            onCreate({ title: value, type: "FOLDER", parentId: null });
          }
        }}
      />

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
