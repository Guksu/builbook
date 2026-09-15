// 바인더 아이콘 — 인라인 SVG(currentColor)로만 그린다.
// 이모지는 OS/폰트마다 모양·크기가 제각각이라 "조용한 사이드바" 느낌이 깨진다.

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

/** 새 문서 — 문서 + 더하기 */
export function FilePlusIcon({ className }: IconProps) {
  return (
    <svg {...base} width="16" height="16" className={className}>
      <path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10A1.5 1.5 0 0 0 4.5 14.5H8" />
      <path d="M9 1.5 12.5 5v3" />
      <path d="M11.5 10v4M9.5 12h4" />
    </svg>
  );
}

/** 새 폴더 — 폴더 + 더하기 */
export function FolderPlusIcon({ className }: IconProps) {
  return (
    <svg {...base} width="16" height="16" className={className}>
      <path d="M1.5 12.5v-9A1 1 0 0 1 2.5 2.5h3l1.5 2h5.5a1 1 0 0 1 1 1V8" />
      <path d="M1.5 12.5h7" />
      <path d="M12 10v4M10 12h4" />
    </svg>
  );
}

/** 정렬 — 길이가 다른 세 줄 */
export function SortIcon({ className }: IconProps) {
  return (
    <svg {...base} width="16" height="16" className={className}>
      <path d="M2.5 4h11M2.5 8h7M2.5 12h4" />
    </svg>
  );
}

/** 모두 접기 — 안쪽으로 모이는 두 화살표 */
export function CollapseAllIcon({ className }: IconProps) {
  return (
    <svg {...base} width="16" height="16" className={className}>
      <path d="M5 2.5 8 5.5l3-3" />
      <path d="M5 13.5 8 10.5l3 3" />
    </svg>
  );
}

/** 모두 펼치기 — 바깥으로 벌어지는 두 화살표 */
export function ExpandAllIcon({ className }: IconProps) {
  return (
    <svg {...base} width="16" height="16" className={className}>
      <path d="M5 5.5 8 2.5l3 3" />
      <path d="M5 10.5 8 13.5l3-3" />
    </svg>
  );
}

/** 폴더 앞 chevron — 펼침(▾) / 접힘(▸) */
export function ChevronIcon({ expanded, className }: IconProps & { expanded: boolean }) {
  return (
    <svg {...base} width="12" height="12" viewBox="0 0 12 12" className={className}>
      {expanded ? <path d="M2.5 4.5 6 8l3.5-3.5" /> : <path d="M4.5 2.5 8 6l-3.5 3.5" />}
    </svg>
  );
}

/** 항목 메뉴(…) */
export function MoreIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden
      focusable={false}
      className={className}
    >
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  );
}

/** 템플릿으로 새 문서 — 줄이 그어진 카드. */
export function TemplateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 6h6M5 8.5h6M5 11h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
