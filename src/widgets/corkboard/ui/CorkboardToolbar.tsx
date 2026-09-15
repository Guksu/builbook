"use client";

import { Button } from "@shared/ui";
import { LABEL_COLOR_CLASS, withDefaultLabels, type ProjectLabel } from "@entities/project";
import { CARD_SIZES, CARD_SIZE_LABEL, type CardLabelFilter, type CardSize } from "@features/corkboard";
import { cn } from "@shared/ui";

interface CorkboardToolbarProps {
  /** 범위로 잡힌 폴더 제목(전체 보기면 null). */
  scopeTitle: string | null;
  onClearScope: () => void;
  labels?: ProjectLabel[];
  labelFilter: CardLabelFilter;
  onChangeLabelFilter: (filter: CardLabelFilter) => void;
  cardSize: CardSize;
  onChangeCardSize: (size: CardSize) => void;
}

/**
 * 코르크보드 위 한 줄 — 어느 폴더를 보고 있는지 + 라벨 필터.
 * 스크리브너에서 폴더를 고르면 그 폴더의 카드만 보이는 것을 그대로 가져왔다.
 */
export function CorkboardToolbar({
  scopeTitle,
  onClearScope,
  labels,
  labelFilter,
  onChangeLabelFilter,
  cardSize,
  onChangeCardSize,
}: CorkboardToolbarProps) {
  const labelList = withDefaultLabels(labels);
  const current = labelFilter && labelFilter !== "none" ? labelList.find((l) => l.id === labelFilter) : null;
  return (
    <div className="flex flex-wrap items-center gap-8 border-b border-border px-24 py-8 text-body-sm">
      <span className="text-fg-weak">보는 범위</span>
      <span className="font-medium text-fg" aria-label="코르크보드 범위">
        {scopeTitle ?? "작품 전체"}
      </span>
      {scopeTitle && (
        <Button size="sm" variant="ghost" onClick={onClearScope}>
          전체 보기
        </Button>
      )}
      <span className="mx-4 h-16 w-px bg-border" aria-hidden />
      <label htmlFor="card-label-filter" className="text-fg-weak">
        라벨
      </label>
      <select
        id="card-label-filter"
        aria-label="카드 라벨 필터"
        value={labelFilter ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChangeLabelFilter(v === "" ? null : v);
        }}
        className="h-28 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
      >
        <option value="">전체</option>
        {labelList.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
        <option value="none">라벨 없음</option>
      </select>
      {current && (
        <span
          aria-hidden
          className={`h-8 w-8 rounded-full ${LABEL_COLOR_CLASS[current.color]}`}
        />
      )}
      <span className="mx-4 h-16 w-px bg-border" aria-hidden />
      <div role="group" aria-label="카드 크기" className="flex rounded-lg bg-surface p-2">
        {CARD_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            aria-pressed={cardSize === size}
            onClick={() => onChangeCardSize(size)}
            className={cn(
              "h-24 rounded-md px-8 text-caption transition-colors",
              cardSize === size ? "bg-bg text-fg shadow-sm" : "text-fg-weak hover:text-fg",
            )}
          >
            {CARD_SIZE_LABEL[size]}
          </button>
        ))}
      </div>
    </div>
  );
}
