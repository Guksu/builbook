"use client";

import { useState } from "react";
import { Button, ConfirmModal, Input, Textarea, cn } from "@shared/ui";
import { GoalMeter, computeProgress, paceToDeadline } from "@features/writing-goals";
import { dateKey } from "@entities/writing-log";
import { formatCount } from "@shared/lib";
import { useCountUnit } from "@features/count-unit";
import { CountUnitSelect } from "@features/count-unit";
import {
  DOC_STATUS_ORDER,
  docStatusLabel,
  normalizeStatus,
} from "@features/corkboard";
import type { DocumentNode } from "@entities/document";
import {
  LABEL_COLORS,
  LABEL_COLOR_CLASS,
  LABEL_COLOR_LABEL,
  addLabel,
  isLabelColor,
  removeLabel,
  renameLabel,
  withDefaultLabels,
  type LabelColor,
  type ProjectLabel,
} from "@entities/project";

interface InspectorProps {
  doc: DocumentNode | null;
  onSaveSynopsis: (id: string, synopsis: string) => void;
  /** 문서 메모(작가 노트) — 시놉시스와 별개. */
  onSaveNote: (id: string, note: string) => void;
  onSaveStatus: (id: string, status: string) => void;
  onSaveLabel: (id: string, labelId: string | null) => void;
  /** 작품 라벨 목록(미설정이면 기본 라벨을 쓴다). */
  labels: ProjectLabel[] | undefined;
  onSaveLabels: (labels: ProjectLabel[]) => void;
  /** 라벨 삭제 시 그 라벨을 달고 있던 문서들의 참조를 비운다. */
  onClearLabelFromDocuments: (labelId: string) => void;
  // 문서 목표 카운터
  currentWords: number;
  onSaveDocGoal: (id: string, goal: number | null) => void;
  // 작품 전체 목표 카운터
  projectTotalWords: number;
  projectGoal: number | null | undefined;
  onSaveProjectGoal: (goal: number | null) => void;
  /** 마감일(YYYY-MM-DD) — 작품 목표와 함께 하루 필요 분량을 계산한다. */
  deadline?: string;
  onSaveDeadline: (deadline: string | null) => void;
}

// 인스펙터: 목표 카운터(문서·작품) + 시놉시스·상태·라벨·메모(모두 blur/선택 즉시 저장).
export function Inspector({
  doc,
  onSaveSynopsis,
  onSaveNote,
  onSaveStatus,
  onSaveLabel,
  labels,
  onSaveLabels,
  onClearLabelFromDocuments,
  currentWords,
  onSaveDocGoal,
  projectTotalWords,
  projectGoal,
  onSaveProjectGoal,
  deadline,
  onSaveDeadline,
}: InspectorProps) {
  const labelList = withDefaultLabels(labels);
  const [unit] = useCountUnit();
  const projectProgress = computeProgress(projectTotalWords, projectGoal);
  const pace = deadline ? paceToDeadline(projectProgress.remaining, deadline, dateKey(new Date())) : null;

  return (
    <div className="flex flex-col gap-16 text-body-sm">
      {/* 분량 단위 — 헤더·목표·현황 숫자가 모두 이 설정을 따른다 */}
      <CountUnitSelect />
      <div className="h-px bg-border" />
      {/* 작품 전체 목표 — 문서 선택과 무관하게 항상 표시 */}
      <GoalMeter
        id="project-goal"
        label="작품 전체"
        inputLabel="작품 목표 분량"
        current={projectTotalWords}
        goal={projectGoal}
        onSave={onSaveProjectGoal}
      />
      {/* 마감일 — 스크리브너 Project Targets의 deadline. 목표가 있어야 페이스가 나온다. */}
      <div className="flex flex-col gap-6">
        <label htmlFor="deadline" className="text-fg-weak">
          마감일
        </label>
        <Input
          id="deadline"
          type="date"
          aria-label="마감일"
          value={deadline ?? ""}
          onChange={(e) => onSaveDeadline(e.target.value || null)}
          className="h-32 text-body-sm"
        />
        {pace && projectProgress.hasGoal && (
          <p className="text-caption text-fg-weak" aria-label="마감 페이스">
            {projectProgress.reached
              ? "목표를 이미 채웠어요."
              : pace.overdue
                ? `마감이 지났어요. 남은 분량 ${formatCount(pace.perDay, unit)}`
                : `${pace.daysLeft}일 남음 · 하루 ${formatCount(pace.perDay, unit)}씩`}
          </p>
        )}
        {deadline && !projectProgress.hasGoal && (
          <p className="text-caption text-fg-weak">작품 목표를 넣으면 하루 분량이 계산돼요.</p>
        )}
      </div>

      {doc ? (
        <>
          <div className="h-px bg-border" />
          {/* key=doc.id 로 문서 전환 시 목표 입력값 리셋. 폴더는 분량이 없으니 목표 칸을 숨긴다. */}
          {doc.type === "DOC" && (
            <GoalMeter
              key={doc.id}
              id="doc-goal"
              label="이 문서"
              inputLabel="문서 목표 분량"
              current={currentWords}
              goal={doc.goal}
              onSave={(g) => onSaveDocGoal(doc.id, g)}
            />
          )}
          <div>
            <label htmlFor="synopsis" className="mb-6 block text-fg-weak">
              시놉시스
            </label>
            {/* key=doc.id 로 문서 전환 시 입력값 리셋. blur 시 변경분만 저장. */}
            <Textarea
              id="synopsis"
              key={`synopsis-${doc.id}`}
              rows={6}
              defaultValue={doc.synopsis ?? ""}
              placeholder="이 문서의 줄거리를 한두 줄로 적어 두세요."
              onBlur={(e) => {
                const next = e.target.value;
                if (next !== (doc.synopsis ?? "")) onSaveSynopsis(doc.id, next);
              }}
            />
          </div>

          {/* 진행 상태 — 코르크보드 상태 칩과 같은 값(단일 출처: features/corkboard) */}
          <div className="flex items-center justify-between gap-8">
            <label htmlFor="doc-status" className="text-fg-weak">
              상태
            </label>
            <select
              id="doc-status"
              aria-label="문서 상태"
              value={normalizeStatus(doc.status)}
              onChange={(e) => onSaveStatus(doc.id, e.target.value)}
              className="h-32 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
            >
              {DOC_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {docStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>

          {/* 라벨 — 작품 단위 분류표에서 하나 고른다 */}
          <LabelSection
            labelList={labelList}
            value={doc.label ?? ""}
            onSelect={(labelId) => onSaveLabel(doc.id, labelId)}
            onSaveLabels={onSaveLabels}
            onClearLabelFromDocuments={onClearLabelFromDocuments}
          />

          <div>
            <label htmlFor="doc-note" className="mb-6 block text-fg-weak">
              메모
            </label>
            {/* 작가 혼자 보는 작업 메모 — 시놉시스와 같은 방식(문서 전환 시 리셋, blur 저장) */}
            <Textarea
              id="doc-note"
              key={`note-${doc.id}`}
              aria-label="문서 메모"
              rows={5}
              defaultValue={doc.note ?? ""}
              placeholder="고칠 것, 참고 자료처럼 나만 볼 메모를 적어 두세요."
              onBlur={(e) => {
                const next = e.target.value;
                if (next !== (doc.note ?? "")) onSaveNote(doc.id, next);
              }}
            />
          </div>
        </>
      ) : (
        <p className="text-fg-weak">
          문서를 선택하면 목표·시놉시스·상태·라벨·메모를 편집할 수 있어요.
        </p>
      )}
    </div>
  );
}

/** 라벨 고르기 + 접히는 '라벨 관리'(추가·이름 변경·삭제). */
function LabelSection({
  labelList,
  value,
  onSelect,
  onSaveLabels,
  onClearLabelFromDocuments,
}: {
  labelList: ProjectLabel[];
  value: string;
  onSelect: (labelId: string | null) => void;
  onSaveLabels: (labels: ProjectLabel[]) => void;
  onClearLabelFromDocuments: (labelId: string) => void;
}) {
  const [managing, setManaging] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<LabelColor>("blue");
  const [deleteTarget, setDeleteTarget] = useState<ProjectLabel | null>(null);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    onSaveLabels(addLabel(labelList, { name, color: newColor }));
    setNewName("");
  }

  function handleDelete(label: ProjectLabel) {
    // 목록에서 빼기 전에 문서 참조부터 비운다 — 죽은 라벨 id가 남지 않게.
    onClearLabelFromDocuments(label.id);
    onSaveLabels(removeLabel(labelList, label.id));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-8">
        <label htmlFor="doc-label" className="text-fg-weak">
          라벨
        </label>
        <select
          id="doc-label"
          aria-label="문서 라벨"
          value={value}
          onChange={(e) => onSelect(e.target.value || null)}
          className="h-32 min-w-0 flex-1 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
        >
          <option value="">없음</option>
          {labelList.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        aria-expanded={managing}
        onClick={() => setManaging((v) => !v)}
        className="self-start text-caption text-fg-weak hover:text-fg"
      >
        라벨 관리
      </button>

      {managing && (
        <div className="flex flex-col gap-8 rounded-md border border-border bg-surface p-8">
          <ul aria-label="라벨 목록" className="flex flex-col gap-6">
            {labelList.length === 0 && (
              <li className="text-caption text-fg-weak">라벨이 없어요. 아래에서 만들어 보세요.</li>
            )}
            {labelList.map((l) => (
              <li key={l.id} className="flex items-center gap-6">
                <ColorSelect
                  label={`${l.name} 색`}
                  value={l.color}
                  onChange={(color) => onSaveLabels(renameLabel(labelList, l.id, { color }))}
                />
                <Input
                  key={`${l.id}:${l.name}`}
                  aria-label={`${l.name} 이름`}
                  defaultValue={l.name}
                  className="h-32 min-w-0 flex-1 px-8 text-body-sm"
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== l.name) {
                      onSaveLabels(renameLabel(labelList, l.id, { name: next }));
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label={`${l.name} 삭제`}
                  onClick={() => setDeleteTarget(l)}
                  className="shrink-0 rounded-sm px-6 py-2 text-caption text-fg-weak hover:text-error"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-6 border-t border-border pt-8">
            <ColorSelect label="새 라벨 색" value={newColor} onChange={setNewColor} />
            <Input
              aria-label="새 라벨 이름"
              value={newName}
              placeholder="예: 시점: 악역"
              className="h-32 min-w-0 flex-1 px-8 text-body-sm"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button size="sm" variant="secondary" onClick={handleAdd} className="shrink-0 px-8">
              추가
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        title={`'${deleteTarget?.name}' 라벨 삭제`}
        description="이 라벨을 달아 둔 문서에서도 라벨이 지워져요. 원고는 그대로예요."
        danger
        confirmText="삭제"
      />
    </div>
  );
}

/** 색 고르기 — 고른 색을 왼쪽 점으로 보여 주고, 선택은 네이티브 select로 받는다. */
function ColorSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LabelColor;
  onChange: (color: LabelColor) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-4">
      <span
        aria-hidden
        className={cn("h-10 w-10 shrink-0 rounded-full", LABEL_COLOR_CLASS[value])}
      />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          if (isLabelColor(e.target.value)) onChange(e.target.value);
        }}
        className="h-32 w-56 rounded-md border border-border bg-bg px-4 text-caption text-fg"
      >
        {LABEL_COLORS.map((c) => (
          <option key={c} value={c}>
            {LABEL_COLOR_LABEL[c]}
          </option>
        ))}
      </select>
    </span>
  );
}
