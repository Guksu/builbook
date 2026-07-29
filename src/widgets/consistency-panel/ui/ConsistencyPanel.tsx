"use client";

import { useMemo, useState } from "react";
import { Button, ConfirmModal, Input, Textarea, cn, useToast } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import {
  TERM_CATEGORIES,
  formatAliases,
  parseAliases,
  termCategoryLabel,
  useTerms,
  type Term,
  type TermCategory,
} from "@entities/term";
import {
  LONG_SENTENCE_CHARS,
  analyzeSentences,
  analyzeTerms,
  toScanDocs,
} from "@features/consistency-check";

export interface ConsistencyPanelProps {
  projectId: string;
  documents: readonly DocumentNode[];
  /** 현재 편집 중인 문서 — 문장 진단 대상. */
  selectedDoc: DocumentNode | null;
}

type Tab = "dictionary" | "check" | "sentences";

const TAB_LABEL: Record<Tab, string> = {
  dictionary: "사전",
  check: "표기 검사",
  sentences: "문장 진단",
};

const EMPTY_FORM = {
  name: "",
  category: "PERSON" as TermCategory,
  aliases: "",
  note: "",
};

/**
 * 설정 일관성 점검 — 고유명사 사전을 세우고(사전), 본문의 표기 흔들림을 찾고(표기 검사),
 * 현재 회차의 문장 리듬을 본다(문장 진단). 셋 다 "고쳐 주는" 게 아니라 "보여 주는" 도구다.
 */
export function ConsistencyPanel({
  projectId,
  documents,
  selectedDoc,
}: ConsistencyPanelProps) {
  const { toast } = useToast();
  const { terms, isLoading, createTerm, updateTerm, deleteTerm } = useTerms(projectId);
  const [tab, setTab] = useState<Tab>("dictionary");
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Term | null>(null);

  // 검사는 본문 전체를 훑으므로 탭을 열었을 때만, 그리고 입력이 그대로면 다시 돌지 않는다.
  const report = useMemo(
    () => (tab === "check" ? analyzeTerms(toScanDocs(documents), terms) : null),
    [tab, documents, terms],
  );
  const sentenceReport = useMemo(
    () => (tab === "sentences" ? analyzeSentences(selectedDoc?.content ?? null) : null),
    [tab, selectedDoc],
  );

  function resetForm() {
    setForm(EMPTY_FORM);
    setAdding(false);
    setEditingId(null);
  }

  async function submit() {
    if (form.name.trim().length < 2) return;
    const payload = {
      name: form.name,
      category: form.category,
      aliases: parseAliases(form.aliases),
      note: form.note,
    };
    try {
      if (editingId) await updateTerm(editingId, payload);
      else await createTerm(payload);
      resetForm();
    } catch {
      toast("용어를 저장하지 못했어요.", "error");
    }
  }

  function startEdit(term: Term) {
    setEditingId(term.id);
    setAdding(true);
    setForm({
      name: term.name,
      category: term.category,
      aliases: formatAliases(term.aliases),
      note: term.note,
    });
  }

  return (
    <div className="flex h-full flex-col gap-12 overflow-y-auto">
      <div role="tablist" aria-label="설정 점검" className="flex gap-4">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-8 py-4 text-caption",
              tab === t ? "bg-bg font-medium text-fg" : "text-fg-weak hover:text-fg",
            )}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "dictionary" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-fg-weak">{terms.length}개 등록</p>
            {!adding && (
              <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
                + 용어
              </Button>
            )}
          </div>

          {adding && (
            <div className="flex flex-col gap-8 rounded-md border border-border bg-bg p-12">
              <Input
                autoFocus
                aria-label="정본 표기"
                placeholder="정본 표기 (예: 테아르)"
                value={form.name}
                className="h-32 text-body-sm"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div role="group" aria-label="분류" className="flex gap-4">
                {TERM_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={form.category === c}
                    onClick={() => setForm({ ...form, category: c })}
                    className={cn(
                      "rounded-md px-8 py-4 text-caption",
                      form.category === c
                        ? "bg-primary-weak text-primary"
                        : "text-fg-weak hover:text-fg",
                    )}
                  >
                    {termCategoryLabel(c)}
                  </button>
                ))}
              </div>
              <Input
                aria-label="허용 표기"
                placeholder="일부러 쓰는 다른 표기 (쉼표로 구분)"
                value={form.aliases}
                className="h-32 text-body-sm"
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              />
              <Textarea
                aria-label="용어 메모"
                placeholder="메모 (선택)"
                value={form.note}
                className="min-h-[56px] text-body-sm"
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <div className="flex justify-end gap-8">
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  취소
                </Button>
                <Button size="sm" onClick={submit} disabled={form.name.trim().length < 2}>
                  {editingId ? "수정" : "추가"}
                </Button>
              </div>
            </div>
          )}

          {isLoading && <p className="text-body-sm text-fg-weak">불러오는 중…</p>}
          {!isLoading && terms.length === 0 && !adding && (
            <p className="text-body-sm text-fg-weak">
              인물·지명·용어의 정본 표기를 등록하면 본문에서 흔들린 표기를 찾아드려요.
            </p>
          )}

          <ul aria-label="용어 목록" className="flex flex-col gap-8">
            {terms.map((term) => (
              <li
                key={term.id}
                className="rounded-md border border-border bg-bg p-12 text-body-sm"
              >
                <div className="flex items-start justify-between gap-8">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">
                      {term.name}
                      <span className="ml-6 text-caption text-fg-weak">
                        {termCategoryLabel(term.category)}
                      </span>
                    </p>
                    {term.aliases.length > 0 && (
                      <p className="mt-2 truncate text-caption text-fg-weak">
                        허용: {formatAliases(term.aliases)}
                      </p>
                    )}
                    {term.note && <p className="mt-4 text-fg-weak">{term.note}</p>}
                  </div>
                  <div className="flex shrink-0 gap-8">
                    <button
                      type="button"
                      className="text-caption text-fg-weak hover:text-fg"
                      onClick={() => startEdit(term)}
                    >
                      편집
                    </button>
                    <button
                      type="button"
                      className="text-caption text-fg-weak hover:text-error"
                      onClick={() => setDeleteTarget(term)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "check" && report && (
        <>
          <p className="text-body-sm text-fg-weak">
            본문 {report.scanned}편을 사전 {terms.length}개 기준으로 훑었어요.
          </p>

          {terms.length === 0 ? (
            <p className="text-body-sm text-fg-weak">
              먼저 <b className="text-fg">사전</b> 탭에서 정본 표기를 등록해 주세요.
            </p>
          ) : report.variants.length === 0 ? (
            <p className="text-body-sm text-success-strong">
              흔들린 표기를 찾지 못했어요.
            </p>
          ) : (
            <ul aria-label="표기 흔들림 목록" className="flex flex-col gap-8">
              {report.variants.map((v) => (
                <li
                  key={`${v.termId}:${v.found}`}
                  className="rounded-md border border-warning bg-bg p-12 text-body-sm"
                >
                  <p className="text-fg">
                    <b className="text-warning-strong">{v.found}</b>
                    <span className="mx-6 text-fg-muted">→</span>
                    {v.term}
                  </p>
                  <p className="mt-4 text-caption text-fg-weak">
                    {v.count}회 · {v.documents.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {terms.length > 0 && (
            <section className="border-t border-border pt-12">
              <p className="mb-6 text-body-sm font-medium text-fg">등장 횟수</p>
              <ul aria-label="용어 등장 횟수" className="flex flex-col gap-2">
                {report.usages.map((u) => (
                  <li
                    key={u.termId}
                    className="flex justify-between text-body-sm text-fg-weak"
                  >
                    <span className="truncate">{u.term}</span>
                    <span className="tabular-nums">{u.count}회</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === "sentences" && (
        <>
          {!selectedDoc || selectedDoc.type !== "DOC" ? (
            <p className="text-body-sm text-fg-weak">
              본문 문서를 선택하면 문장 리듬을 진단해요.
            </p>
          ) : !sentenceReport || sentenceReport.sentences === 0 ? (
            <p className="text-body-sm text-fg-weak">아직 진단할 문장이 없어요.</p>
          ) : (
            <div className="flex flex-col gap-12 text-body-sm">
              <p className="text-fg-weak">‘{selectedDoc.title}’ 진단</p>

              <ul className="flex flex-col gap-4">
                <li className="flex justify-between">
                  <span className="text-fg-weak">문장 수</span>
                  <span className="tabular-nums text-fg">{sentenceReport.sentences}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-fg-weak">평균 길이</span>
                  <span className="tabular-nums text-fg">
                    {sentenceReport.averageChars}자
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-fg-weak">
                    긴 문장({LONG_SENTENCE_CHARS}자 초과)
                  </span>
                  <span className="tabular-nums text-fg">{sentenceReport.longCount}개</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-fg-weak">대사 비율</span>
                  <span className="tabular-nums text-fg">
                    {sentenceReport.dialogueRatio}%
                  </span>
                </li>
              </ul>

              {sentenceReport.longest && (
                <section>
                  <p className="mb-4 font-medium text-fg">가장 긴 문장</p>
                  <p className="rounded-md border border-border bg-bg p-8 text-fg-weak">
                    {sentenceReport.longest.text.slice(0, 120)}
                    {sentenceReport.longest.text.length > 120 ? "…" : ""}
                    <span className="ml-6 text-caption">
                      ({sentenceReport.longest.chars}자)
                    </span>
                  </p>
                </section>
              )}

              <section>
                <p className="mb-4 font-medium text-fg">어미 반복</p>
                {sentenceReport.endingRuns.length === 0 ? (
                  <p className="text-fg-weak">연달아 반복되는 어미가 없어요.</p>
                ) : (
                  <ul aria-label="어미 반복 목록" className="flex flex-col gap-2">
                    {sentenceReport.endingRuns.map((run, i) => (
                      <li key={`${run.ending}:${run.from}:${i}`} className="text-fg-weak">
                        …{run.ending} × {run.count}회 연속{" "}
                        <span className="text-caption">({run.from}번째 문장부터)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {sentenceReport.repeatedWords.length > 0 && (
                <section>
                  <p className="mb-4 font-medium text-fg">자주 쓴 말</p>
                  <p className="text-fg-weak">
                    {sentenceReport.repeatedWords
                      .map((w) => `${w.word}(${w.count})`)
                      .join(" · ")}
                  </p>
                </section>
              )}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteTerm(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={`'${deleteTarget?.name}' 삭제`}
        description="사전에서만 지웁니다. 본문은 그대로예요."
        danger
        confirmText="삭제"
      />
    </div>
  );
}
