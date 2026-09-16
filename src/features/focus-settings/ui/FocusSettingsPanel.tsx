"use client";

import { cn } from "@shared/ui";
import {
  FONT_SIZES,
  FONT_SIZE_LABEL,
  LINE_HEIGHTS,
  LINE_HEIGHT_LABEL,
  WIDTHS,
  WIDTH_LABEL,
  type FocusSettings,
} from "../lib/settings";

interface FocusSettingsPanelProps {
  settings: FocusSettings;
  onChange: (next: Partial<FocusSettings>) => void;
  /** 타이프라이터 스크롤 항목 표시(집중 모드에서만 의미가 있다). */
  showTypewriter?: boolean;
}

/** 본문 표시 설정 — 글자 크기·줄 간격·본문 폭·타이프라이터 스크롤. 집중 모드 오버레이와 툴바 "Aa"가 공유. */
export function FocusSettingsPanel({ settings, onChange, showTypewriter = true }: FocusSettingsPanelProps) {
  return (
    <div role="group" aria-label="본문 표시 설정" className="flex flex-col gap-10 text-body-sm">
      <Row label="글자 크기">
        <Segment
          value={settings.fontSize}
          options={FONT_SIZES.map((v) => [v, FONT_SIZE_LABEL[v]] as const)}
          onChange={(v) => onChange({ fontSize: v })}
          name="글자 크기"
        />
      </Row>
      <Row label="줄 간격">
        <Segment
          value={settings.lineHeight}
          options={LINE_HEIGHTS.map((v) => [v, LINE_HEIGHT_LABEL[v]] as const)}
          onChange={(v) => onChange({ lineHeight: v })}
          name="줄 간격"
        />
      </Row>
      <Row label="본문 폭">
        <Segment
          value={settings.width}
          options={WIDTHS.map((v) => [v, WIDTH_LABEL[v]] as const)}
          onChange={(v) => onChange({ width: v })}
          name="본문 폭"
        />
      </Row>
      {showTypewriter && (
        <label className="flex items-center justify-between gap-8">
          <span className="text-fg-weak">타이프라이터 스크롤</span>
          <input
            type="checkbox"
            aria-label="타이프라이터 스크롤"
            checked={settings.typewriter}
            onChange={(e) => onChange({ typewriter: e.target.checked })}
          />
        </label>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="shrink-0 text-fg-weak">{label}</span>
      {children}
    </div>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="group" aria-label={name} className="flex rounded-lg bg-surface p-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-24 rounded-md px-8 text-caption transition-colors",
            value === v ? "bg-bg text-fg shadow-sm" : "text-fg-weak hover:text-fg",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
