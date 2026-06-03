"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { Binder } from "@/components/binder/Binder";
import { Editor } from "@/components/editor/Editor";
import { useDocuments } from "@/hooks/useDocuments";
import { useToast } from "@/components/ui";

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const {
    documents,
    isLoading,
    error,
    createDocument,
    renameDocument,
    deleteDocument,
  } = useDocuments(id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // 첫 DOC 자동 선택. 선택 문서가 사라지면 해제.
  useEffect(() => {
    if (selectedId && !documents.some((d) => d.id === selectedId)) {
      setSelectedId(null);
    }
    if (!selectedId) {
      const firstDoc = documents.find((d) => d.type === "DOC");
      if (firstDoc) setSelectedId(firstDoc.id);
    }
  }, [documents, selectedId]);

  const selected = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId],
  );

  async function handleCreate(input: {
    title: string;
    type: "FOLDER" | "DOC";
    parentId: string | null;
  }) {
    try {
      const doc = await createDocument(input);
      if (doc.type === "DOC") setSelectedId(doc.id);
    } catch {
      toast("문서 생성에 실패했어요.", "error");
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 바 */}
      <header className="flex h-48 items-center justify-between border-b border-border px-16">
        <Link href="/dashboard" className="text-body-sm text-fg-weak hover:text-fg">
          ← 작품 목록
        </Link>
        <button
          type="button"
          className="text-caption text-fg-weak hover:text-fg"
          onClick={() => setInspectorOpen((v) => !v)}
        >
          {inspectorOpen ? "인스펙터 닫기" : "인스펙터"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 좌: 바인더 */}
        <aside className="w-[260px] shrink-0">
          <Binder
            documents={documents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={handleCreate}
            onRename={renameDocument}
            onDelete={deleteDocument}
          />
        </aside>

        {/* 중: 에디터 */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-bg">
          {isLoading && (
            <p className="p-24 text-body text-fg-weak">불러오는 중…</p>
          )}
          {error && (
            <p className="p-24 text-body text-error">문서를 불러오지 못했어요.</p>
          )}
          {!isLoading && !error && !selected && (
            <div className="flex h-full flex-col items-center justify-center gap-8 text-center text-fg-weak">
              <p className="text-body-lg">왼쪽에서 문서를 선택하거나</p>
              <p className="text-body">
                <b className="text-fg">+ 문서</b>로 첫 글을 시작하세요.
              </p>
            </div>
          )}
          {selected && selected.type === "DOC" && (
            <Editor
              key={selected.id}
              documentId={selected.id}
              initialContent={(selected.content as JSONContent | null) ?? null}
              title={selected.title}
            />
          )}
        </main>

        {/* 우: 인스펙터 (기본 접힘) */}
        {inspectorOpen && (
          <aside className="w-[280px] shrink-0 border-l border-border bg-surface p-16">
            <h2 className="mb-12 text-caption font-medium text-fg-weak">인스펙터</h2>
            {selected ? (
              <dl className="flex flex-col gap-12 text-body-sm">
                <div>
                  <dt className="text-fg-weak">단어 수</dt>
                  <dd className="text-fg">{selected.wordCount}</dd>
                </div>
                <div>
                  <dt className="text-fg-weak">시놉시스</dt>
                  <dd className="text-fg">{selected.synopsis || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-body-sm text-fg-weak">문서를 선택하세요.</p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
