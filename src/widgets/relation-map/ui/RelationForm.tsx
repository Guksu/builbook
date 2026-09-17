"use client";

import { useState } from "react";
import { Button, Input, Modal, Textarea } from "@shared/ui";
import { LABEL_COLORS, LABEL_COLOR_LABEL } from "@entities/project";
import {
  RELATION_TYPES,
  isValidRelationType,
  relationTypeColor,
  type Relation,
  type RelationChange,
  type RelationInput,
} from "@entities/relation";

export interface RelationFormProps {
  open: boolean;
  onClose: () => void;
  /** A 이름(from) · B 이름(to). */
  fromName: string;
  toName: string;
  /** 기존 관계를 고치는 중이면 값이 있다. */
  existing: Relation | null;
  onSubmit: (input: RelationInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  /** 회차별 변화에 고를 회차 목록(바인더 순서). */
  episodes: readonly { id: string; title: string }[];
  /** 작품에서 고른 종류별 색. */
  typeColors?: Readonly<Record<string, string>> | null;
  /** 종류의 색을 바꾸면(모든 같은 종류의 선에 적용). null = 기본 색으로. */
  onSaveTypeColor?: (type: string, color: string | null) => void | Promise<void>;
}

/** 관계 하나를 적는 폼 — 종류(프리셋 또는 직접), 방향별 한 줄, 메모. */
export function RelationForm({
  open,
  onClose,
  fromName,
  toName,
  existing,
  onSubmit,
  onDelete,
  episodes,
  typeColors,
  onSaveTypeColor,
}: RelationFormProps) {
  const initialPreset = existing && RELATION_TYPES.includes(existing.type) ? existing.type : existing ? "직접 입력" : RELATION_TYPES[0];
  const [preset, setPreset] = useState<string>(initialPreset);
  const [custom, setCustom] = useState(existing && !RELATION_TYPES.includes(existing.type) ? existing.type : "");
  const [fromLabel, setFromLabel] = useState(existing?.fromLabel ?? "");
  const [toLabel, setToLabel] = useState(existing?.toLabel ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [changes, setChanges] = useState<RelationChange[]>(existing?.changes ?? []);
  const [busy, setBusy] = useState(false);

  function updateChange(i: number, patch: Partial<RelationChange>) {
    setChanges((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  const type = preset === "직접 입력" ? custom : preset;
  const valid = isValidRelationType(type);
  // 종류 색 — ""는 "바꾸지 않음". 고르면 저장 시 작품에 반영된다.
  const [colorChoice, setColorChoice] = useState<string>("");
  const currentColor = relationTypeColor(type, typeColors);

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSubmit({ type, fromLabel, toLabel, note, changes });
      if (colorChoice && onSaveTypeColor) {
        await onSaveTypeColor(type, colorChoice === "default" ? null : colorChoice);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "관계 고치기" : "관계 만들기"}
      description={`${fromName} ↔ ${toName}`}
      footer={
        <>
          {existing && onDelete && (
            <Button
              variant="danger"
              onClick={async () => {
                await onDelete();
                onClose();
              }}
              className="mr-auto"
            >
              관계 삭제
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} disabled={!valid || busy}>
            {existing ? "저장" : "만들기"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <label htmlFor="relation-type" className="text-caption text-fg-weak">
            종류
          </label>
          <div className="flex gap-6">
            <select
              id="relation-type"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="h-40 rounded-md border border-border bg-bg px-8 text-body text-fg"
            >
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="직접 입력">직접 입력</option>
            </select>
            {preset === "직접 입력" && (
              <Input
                aria-label="종류 직접 입력"
                placeholder="예: 옛 스승"
                maxLength={20}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                autoFocus
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-8">
          <label htmlFor="relation-type-color" className="text-caption text-fg-weak">
            이 종류의 선 색 <span className="text-fg-muted">(같은 종류 모두)</span>
          </label>
          <select
            id="relation-type-color"
            value={colorChoice || currentColor}
            onChange={(e) => setColorChoice(e.target.value)}
            className="h-32 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
          >
            {LABEL_COLORS.map((c) => (
              <option key={c} value={c}>
                {LABEL_COLOR_LABEL[c]}
              </option>
            ))}
            <option value="default">기본 색</option>
          </select>
        </div>
        <div className="flex flex-col gap-4">
          <label htmlFor="relation-from" className="text-caption text-fg-weak">
            {fromName} → {toName}
          </label>
          <Input
            id="relation-from"
            placeholder="예: 짝사랑, 원수라 여김"
            maxLength={40}
            value={fromLabel}
            onChange={(e) => setFromLabel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <label htmlFor="relation-to" className="text-caption text-fg-weak">
            {toName} → {fromName}
          </label>
          <Input
            id="relation-to"
            placeholder="예: 경계, 은인으로 생각"
            maxLength={40}
            value={toLabel}
            onChange={(e) => setToLabel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-caption text-fg-weak">회차별 변화</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={episodes.length === 0}
              title={episodes.length === 0 ? "회차가 있어야 해요" : undefined}
              onClick={() => setChanges((prev) => [...prev, { documentId: episodes[0]?.id ?? "", note: "" }])}
            >
              + 변화 추가
            </Button>
          </div>
          {changes.length === 0 && (
            <p className="text-caption text-fg-weak">예: 3화에서 동맹이 된다. 관계도의 시점 보기와 연표에 나타나요.</p>
          )}
          {changes.map((c, i) => (
            <div key={i} className="flex gap-6" role="group" aria-label={`변화 ${i + 1}`}>
              <select
                aria-label="변화 회차"
                value={c.documentId}
                onChange={(e) => updateChange(i, { documentId: e.target.value })}
                className="h-40 max-w-[140px] rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
              >
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.title}
                  </option>
                ))}
              </select>
              <Input
                aria-label="변화 내용"
                placeholder="이 회차에서 관계가 어떻게 되나"
                maxLength={40}
                value={c.note}
                onChange={(e) => updateChange(i, { note: e.target.value })}
              />
              <Button
                size="sm"
                variant="ghost"
                aria-label="변화 삭제"
                className="mt-4 shrink-0"
                onClick={() => setChanges((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <label htmlFor="relation-note" className="text-caption text-fg-weak">
            메모
          </label>
          <Textarea
            id="relation-note"
            rows={2}
            placeholder="첫 만남, 바뀌는 회차 같은 것"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
