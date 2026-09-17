"use client";

import { useState } from "react";
import { Button, Textarea } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { ideaKindLabel, type Idea } from "@entities/idea";

interface MemoTabProps {
  ideas: readonly Idea[];
  isLoading: boolean;
  documents: readonly DocumentNode[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
  onOpenDocument?: (id: string) => void;
}

/** 메모 탭 — 뽑은 카드·조합·AI 답·직접 쓴 메모를 최신순으로. 회차에 붙은 메모는 그 회차로 이동. */
export function MemoTab({ ideas, isLoading, documents, onAdd, onDelete, onOpenDocument }: MemoTabProps) {
  const [draft, setDraft] = useState("");
  const titleOf = (id?: string) => (id ? documents.find((d) => d.id === id)?.title ?? null : null);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6">
        <Textarea
          rows={2}
          aria-label="새 메모"
          placeholder="떠오른 것을 바로 적어요. 현재 회차에 붙어요."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={!draft.trim()}
          onClick={() => {
            onAdd(draft);
            setDraft("");
          }}
        >
          메모 추가
        </Button>
      </div>

      {isLoading && <p className="text-body-sm text-fg-weak">불러오는 중…</p>}
      {!isLoading && ideas.length === 0 && (
        <p className="text-body-sm text-fg-weak">뽑은 카드나 AI 답을 여기에 모아요.</p>
      )}

      <ul aria-label="아이디어 메모" className="flex flex-col gap-8">
        {ideas.map((idea) => {
          const linked = titleOf(idea.linkedDocumentId);
          return (
            <li key={idea.id} className="rounded-lg border border-border bg-bg p-12">
              <div className="mb-4 flex items-center justify-between gap-8 text-caption text-fg-weak">
                <span className="truncate">
                  <span className="rounded-sm bg-surface px-6 py-2 text-fg-weak">{ideaKindLabel(idea.kind)}</span>
                  {idea.source && <span className="ml-6">{idea.source}</span>}
                </span>
                <button
                  type="button"
                  className="shrink-0 hover:text-error"
                  aria-label="메모 삭제"
                  onClick={() => onDelete(idea.id)}
                >
                  삭제
                </button>
              </div>
              <p className="whitespace-pre-wrap text-body-sm text-fg">{idea.text}</p>
              {linked && (
                <button
                  type="button"
                  className="mt-6 text-caption text-fg-weak underline hover:text-fg"
                  onClick={() => onOpenDocument?.(idea.linkedDocumentId!)}
                >
                  {linked}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
