"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Modal,
  ConfirmModal,
  Input,
  Textarea,
  useToast,
} from "@shared/ui";
import {
  useNotes,
  filterByCategory,
  countByCategory,
  isValidNoteTitle,
  notePreview,
  type Note,
  type NoteCategory,
} from "@entities/note";

interface NotesPanelProps {
  /** 현재 작품 id — 노트는 작품 단위. */
  projectId: string;
}

const CATEGORY_META: Record<
  NoteCategory,
  { tab: string; titleLabel: string; titlePlaceholder: string; empty: string }
> = {
  CHARACTER: {
    tab: "캐릭터",
    titleLabel: "이름",
    titlePlaceholder: "예: 홍길동",
    empty: "아직 캐릭터가 없어요. 인물의 이름·역할·성격을 적어 두면 집필 중 헷갈리지 않아요.",
  },
  SETTING: {
    tab: "설정",
    titleLabel: "제목",
    titlePlaceholder: "예: 마법 체계, 왕국 지리",
    empty: "아직 설정이 없어요. 세계관·규칙·장소를 메모해 두면 이야기가 흔들리지 않아요.",
  },
};

// 편집 폼 상태 — 새 노트는 editing=null, 기존 노트 편집은 해당 Note.
type FormState =
  | { mode: "create"; category: NoteCategory }
  | { mode: "edit"; note: Note };

// 작업실의 '리서치' 패널 본체: 캐릭터/설정 탭 · 목록 · 추가/편집(Modal) · 삭제(Confirm).
// 바인더(문서 트리)와 분리된 작품 단위 참고 자료.
export function NotesPanel({ projectId }: NotesPanelProps) {
  const { toast } = useToast();
  const { notes, isLoading, createNote, updateNote, deleteNote } =
    useNotes(projectId);

  const [category, setCategory] = useState<NoteCategory>("CHARACTER");
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => countByCategory(notes), [notes]);
  const visible = useMemo(
    () => filterByCategory(notes, category),
    [notes, category],
  );
  const meta = CATEGORY_META[category];

  function openCreate() {
    setForm({ mode: "create", category });
  }

  return (
    <div className="flex h-full flex-col gap-12">
      <div>
        <h2 className="text-h3 text-fg">리서치 노트</h2>
        <p className="mt-2 text-caption text-fg-weak">
          캐릭터와 설정을 문서와 따로 정리해요.
        </p>
      </div>

      {/* 카테고리 탭 */}
      <div role="tablist" aria-label="노트 카테고리" className="flex gap-4">
        {(["CHARACTER", "SETTING"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={
              category === c
                ? "rounded-md px-8 py-4 text-caption font-medium text-fg"
                : "rounded-md px-8 py-4 text-caption text-fg-weak hover:text-fg"
            }
          >
            {CATEGORY_META[c].tab}
            <span className="ml-4 tabular-nums text-fg-weak">
              {counts[c]}
            </span>
          </button>
        ))}
      </div>

      <Button variant="secondary" className="w-full" onClick={openCreate}>
        + {meta.tab} 추가
      </Button>

      {isLoading && <p className="text-body-sm text-fg-weak">불러오는 중…</p>}

      {!isLoading && visible.length === 0 && (
        <p className="text-body-sm text-fg-weak">{meta.empty}</p>
      )}

      <ul
        aria-label={`${meta.tab} 목록`}
        className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto"
      >
        {visible.map((n) => (
          <li key={n.id} className="rounded-lg border border-border bg-bg p-12">
            <div className="flex items-start justify-between gap-8">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-fg">
                  {n.title}
                </p>
                {n.role && (
                  <p className="truncate text-caption text-fg-weak">{n.role}</p>
                )}
                {n.body.trim() && (
                  <p className="mt-2 truncate text-caption text-fg-weak">
                    {notePreview(n.body)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-4">
                <button
                  type="button"
                  className="rounded-md px-6 py-2 text-caption text-fg-weak hover:text-fg"
                  onClick={() => setForm({ mode: "edit", note: n })}
                >
                  편집
                </button>
                <button
                  type="button"
                  className="rounded-md px-6 py-2 text-caption text-fg-weak hover:text-error"
                  onClick={() => setDeleteTarget(n)}
                >
                  삭제
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {form && (
        <NoteFormModal
          form={form}
          busy={busy}
          onClose={() => setForm(null)}
          onSubmit={async (values) => {
            if (busy) return;
            setBusy(true);
            try {
              if (form.mode === "create") {
                await createNote({
                  projectId,
                  category: form.category,
                  ...values,
                });
                toast("노트를 추가했어요.", "success");
              } else {
                await updateNote(form.note.id, values);
                toast("노트를 저장했어요.", "success");
              }
              setForm(null);
            } catch {
              toast("저장에 실패했어요.", "error");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteNote(deleteTarget.id);
          } catch {
            toast("삭제에 실패했어요.", "error");
          } finally {
            setDeleteTarget(null);
          }
        }}
        title="노트 삭제"
        description="이 노트를 영구 삭제해요. 되돌릴 수 없어요."
        confirmText="삭제"
        danger
      />
    </div>
  );
}

interface NoteFormValues {
  title: string;
  role: string | null;
  body: string;
}

function NoteFormModal({
  form,
  busy,
  onClose,
  onSubmit,
}: {
  form: FormState;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: NoteFormValues) => void | Promise<void>;
}) {
  const category = form.mode === "create" ? form.category : form.note.category;
  const meta = CATEGORY_META[category];
  const initial = form.mode === "edit" ? form.note : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  const canSubmit = isValidNoteTitle(title) && !busy;

  function submit() {
    if (!canSubmit) return;
    void onSubmit({
      title,
      role: category === "CHARACTER" ? role.trim() || null : null,
      body,
    });
  }

  const verb = form.mode === "create" ? "추가" : "저장";

  return (
    <Modal
      open
      onClose={onClose}
      title={`${meta.tab} ${verb}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {verb}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-12">
        <div>
          <label
            htmlFor="note-title"
            className="mb-6 block text-body-sm text-fg-weak"
          >
            {meta.titleLabel}
          </label>
          <Input
            id="note-title"
            autoFocus
            placeholder={meta.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {category === "CHARACTER" && (
          <div>
            <label
              htmlFor="note-role"
              className="mb-6 block text-body-sm text-fg-weak"
            >
              역할 (선택)
            </label>
            <Input
              id="note-role"
              placeholder="예: 주인공, 조력자, 악역"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
        )}

        <div>
          <label
            htmlFor="note-body"
            className="mb-6 block text-body-sm text-fg-weak"
          >
            설명 (선택)
          </label>
          <Textarea
            id="note-body"
            rows={5}
            placeholder={
              category === "CHARACTER"
                ? "성격, 외모, 목표, 관계 등"
                : "규칙, 배경, 분위기 등"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
