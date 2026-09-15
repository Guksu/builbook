"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

// 좌표에 띄우는 작은 메뉴(우클릭 메뉴 / 아이콘 버튼 드롭다운 공용).
// 모달이 아니므로 배경을 가리지 않고, Esc·바깥 클릭·스크롤로 조용히 닫힌다.

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  /** 삭제 등 되돌리기 어려운 항목 */
  danger?: boolean;
  /** 지정하면 라디오 항목(현재 선택 표시)으로 렌더 — 정렬 기준 같은 택일 메뉴용 */
  checked?: boolean;
  /** 이름 앞에 찍을 색 점의 배경 유틸 클래스(라벨 색 등). 없으면 점을 그리지 않는다. */
  dotClass?: string;
}

export interface ContextMenuProps {
  /** 뷰포트 기준 좌표(clientX/clientY 또는 버튼의 getBoundingClientRect) */
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  /** 스크린리더용 메뉴 이름 */
  label: string;
}

const MENU_WIDTH = 180;
const ITEM_HEIGHT = 32;

export function ContextMenu({ x, y, items, onClose, label }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 열리면 첫 항목에 포커스 — 키보드만으로도 바로 고를 수 있게.
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    // capture로 받아야 메뉴 밖 버튼이 클릭되기 전에 닫힌다.
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  // 화면 밖으로 삐져나가지 않게 오른쪽/아래를 잘라 맞춘다.
  const left = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
  const top = Math.max(
    8,
    Math.min(y, window.innerHeight - items.length * ITEM_HEIGHT - 16),
  );

  const move = (from: HTMLElement, delta: number) => {
    const buttons = [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ];
    const idx = buttons.indexOf(from as HTMLButtonElement);
    const next = buttons[(idx + delta + buttons.length) % buttons.length];
    next?.focus();
  };

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      style={{ left, top, width: MENU_WIDTH }}
      className="fixed z-50 rounded-md border border-border bg-bg p-4 shadow-md"
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          move(e.target as HTMLElement, 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          move(e.target as HTMLElement, -1);
        } else if (e.key === "Tab") {
          onClose();
        }
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role={item.checked === undefined ? "menuitem" : "menuitemradio"}
          aria-checked={item.checked}
          className={cn(
            "flex w-full items-center gap-6 rounded-sm px-8 py-6 text-left text-body-sm",
            "hover:bg-surface focus-visible:bg-surface focus-visible:outline-none",
            item.danger ? "text-error" : "text-fg",
          )}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
        >
          {item.checked !== undefined && (
            <span aria-hidden className="w-12 shrink-0 text-primary">
              {item.checked ? "✓" : ""}
            </span>
          )}
          {item.dotClass && (
            <span
              aria-hidden
              className={cn("h-8 w-8 shrink-0 rounded-full", item.dotClass)}
            />
          )}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
