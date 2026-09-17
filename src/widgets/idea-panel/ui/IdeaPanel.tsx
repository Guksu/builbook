"use client";

import { useState } from "react";
import { useToast } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import type { Project, AiModelChoice } from "@entities/project";
import { useIdeas, type IdeaKind } from "@entities/idea";
import type { Genre } from "@features/idea-cards";
import { DrawTab } from "./DrawTab";
import { AiTab } from "./AiTab";
import { MemoTab } from "./MemoTab";

export interface IdeaPanelProps {
  projectId: string;
  project: Project | null;
  documents: readonly DocumentNode[];
  selectedDoc: DocumentNode | null;
  onSaveGenre: (genre: Genre) => void | Promise<void>;
  onSaveAiModel: (model: AiModelChoice) => void | Promise<void>;
  onOpenDocument?: (id: string) => void;
}

type Tab = "draw" | "ai" | "memo";
const TAB_LABEL: Record<Tab, string> = { draw: "뽑기", ai: "AI", memo: "메모" };

/**
 * 영감 서랍 — 막혔을 때 30초 안에 다음 한 걸음을 얻는 패널.
 * 뽑기(오프라인)·AI(내 키)·메모(모아 두기). 결정은 언제나 작가가 한다.
 */
export function IdeaPanel({
  projectId,
  project,
  documents,
  selectedDoc,
  onSaveGenre,
  onSaveAiModel,
  onOpenDocument,
}: IdeaPanelProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("draw");
  const { ideas, isLoading, createIdea, deleteIdea } = useIdeas(projectId);

  async function save(kind: IdeaKind, text: string, source?: string) {
    try {
      const idea = await createIdea({
        kind,
        text,
        source,
        linkedDocumentId: selectedDoc?.type === "DOC" ? selectedDoc.id : null,
      });
      if (idea) toast("메모에 저장했어요.", "success");
    } catch {
      toast("메모 저장에 실패했어요.", "error");
    }
  }

  return (
    <div className="flex h-full flex-col gap-12">
      <div>
        <h2 className="text-h3 text-fg">영감 서랍</h2>
        <p className="mt-2 text-caption text-fg-weak">막히면 뽑고, 묻고, 모아 두세요.</p>
      </div>
      <div role="tablist" aria-label="영감 서랍 탭" className="flex gap-4">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "rounded-md px-8 py-4 text-caption font-medium text-fg"
                : "rounded-md px-8 py-4 text-caption text-fg-weak hover:text-fg"
            }
          >
            {TAB_LABEL[t]}
            {t === "memo" && ideas.length > 0 && (
              <span className="ml-4 tabular-nums text-fg-weak">{ideas.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "draw" && (
          <DrawTab genre={project?.genre} onSaveGenre={onSaveGenre} documents={documents} onSave={save} />
        )}
        {tab === "ai" && (
          <AiTab
            projectTitle={project?.title ?? ""}
            aiModel={project?.aiModel}
            onSaveAiModel={onSaveAiModel}
            documents={documents}
            selectedDoc={selectedDoc}
            onSave={save}
          />
        )}
        {tab === "memo" && (
          <MemoTab
            ideas={ideas}
            isLoading={isLoading}
            documents={documents}
            onAdd={(text) => void save("note", text)}
            onDelete={(id) => void deleteIdea(id)}
            onOpenDocument={onOpenDocument}
          />
        )}
      </div>
    </div>
  );
}
