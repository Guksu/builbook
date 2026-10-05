"use client";

import { useState } from "react";
import { Button, Input, Textarea, ConfirmModal, cn, useToast } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import {
  buildTimelineRows,
  useStoryEvents,
  type StoryEvent,
} from "@entities/story-event";

export interface TimelinePanelProps {
  projectId: string;
  /** 사건에 연결할 수 있는 회차 목록(휴지통 제외된 현재 문서들). */
  documents: readonly DocumentNode[];
  /** 연결된 회차를 클릭하면 에디터에서 연다. */
  onOpenDocument?: (id: string) => void;
}

const EMPTY_FORM = { title: "", when: "", body: "", documentId: "" };

/**
 * 타임라인(연표) — 작중 사건을 시간 순으로 세우고 회차와 연결한다.
 * 서술 순서(바인더)와 사건 순서가 다른 이야기에서 앞뒤가 맞는지 확인하는 용도다.
 */
export function TimelinePanel({
  projectId,
  documents,
  onOpenDocument,
}: TimelinePanelProps) {
  const { toast } = useToast();
  const { events, isLoading, createEvent, updateEvent, deleteEvent, moveEventBy } =
    useStoryEvents(projectId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoryEvent | null>(null);

  const docOptions = documents.filter((d) => d.type === "DOC");
  const rows = buildTimelineRows(events, docOptions);

  function resetForm() {
    setForm(EMPTY_FORM);
    setAdding(false);
    setEditingId(null);
  }

  async function submit() {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      when: form.when,
      body: form.body,
      documentId: form.documentId || null,
    };
    try {
      if (editingId) {
        await updateEvent(editingId, payload);
      } else {
        await createEvent(payload);
      }
      resetForm();
    } catch {
      toast("사건을 저장하지 못했어요.", "error");
    }
  }

  function startEdit(event: StoryEvent) {
    setEditingId(event.id);
    setAdding(true);
    setForm({
      title: event.title,
      when: event.when,
      body: event.body,
      documentId: event.documentId ?? "",
    });
  }

  return (
    <div className="flex h-full flex-col gap-12 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-medium text-fg">타임라인</h2>
        {!adding && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            + 사건
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex flex-col gap-8 rounded-md border border-border bg-bg p-12">
          <Input
            autoFocus
            aria-label="사건 이름"
            placeholder="사건 이름 (예: 주인공 회귀)"
            value={form.title}
            className="h-32 text-body-sm"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            aria-label="작중 시점"
            placeholder="작중 시점 (예: 1024년 봄)"
            value={form.when}
            className="h-32 text-body-sm"
            onChange={(e) => setForm({ ...form, when: e.target.value })}
          />
          <Textarea
            aria-label="사건 설명"
            placeholder="무슨 일이 있었나요? (선택)"
            value={form.body}
            className="min-h-[64px] text-body-sm"
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <select
            aria-label="연결할 회차"
            value={form.documentId}
            onChange={(e) => setForm({ ...form, documentId: e.target.value })}
            className="h-32 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
          >
            <option value="">연결할 회차 없음</option>
            {docOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-8">
            <Button size="sm" variant="ghost" onClick={resetForm}>
              취소
            </Button>
            <Button size="sm" onClick={submit} disabled={!form.title.trim()}>
              {editingId ? "수정" : "추가"}
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-body-sm text-fg-weak">불러오는 중…</p>}

      {!isLoading && rows.length === 0 && !adding && (
        <p className="text-body-sm text-fg-weak">
          아직 사건이 없어요. <b className="text-fg">+ 사건</b>으로 연표를 시작하세요.
        </p>
      )}

      <ol aria-label="타임라인 목록" className="flex flex-col gap-8">
        {rows.map(({ event, documentTitle, brokenLink }, index) => (
          <li
            key={event.id}
            className="rounded-md border border-border bg-bg p-12 text-body-sm"
          >
            <div className="flex items-start gap-8">
              <div className="min-w-0 flex-1">
                {event.when && (
                  <p className="text-caption text-fg-weak">{event.when}</p>
                )}
                <p className="truncate font-medium text-fg">{event.title}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  aria-label={`${event.title} 위로`}
                  disabled={index === 0}
                  onClick={() => moveEventBy(event.id, "up")}
                  className="text-caption text-fg-weak hover:text-fg disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`${event.title} 아래로`}
                  disabled={index === rows.length - 1}
                  onClick={() => moveEventBy(event.id, "down")}
                  className="text-caption text-fg-weak hover:text-fg disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </div>

            {event.body && <p className="mt-6 text-fg-weak">{event.body}</p>}

            <div className="mt-8 flex items-center justify-between gap-8">
              {documentTitle ? (
                <button
                  type="button"
                  className="min-w-0 truncate text-caption text-primary hover:underline"
                  onClick={() => event.documentId && onOpenDocument?.(event.documentId)}
                >
                  📄 {documentTitle}
                </button>
              ) : (
                <span
                  className={cn(
                    "text-caption",
                    brokenLink ? "text-error" : "text-fg-muted",
                  )}
                >
                  {brokenLink ? "연결된 회차가 사라졌어요" : "연결된 회차 없음"}
                </span>
              )}
              <div className="flex shrink-0 gap-8">
                <button
                  type="button"
                  className="text-caption text-fg-weak hover:text-fg"
                  onClick={() => startEdit(event)}
                >
                  편집
                </button>
                <button
                  type="button"
                  className="text-caption text-fg-weak hover:text-error"
                  onClick={() => setDeleteTarget(event)}
                >
                  삭제
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteEvent(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={`'${deleteTarget?.title}' 삭제`}
        description="연표에서 이 사건을 지웁니다. 원고는 그대로예요."
        danger
        confirmText="삭제"
      />
    </div>
  );
}
