"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { Button } from "./Button";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  /** 푸터 영역 (버튼 등). 없으면 렌더 안 함 */
  footer?: React.ReactNode;
  /** 패널 추가 클래스 (너비 등) */
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  // ESC 닫기 + body 스크롤 잠금 (접근성)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-16"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-[480px] rounded-xl border border-border bg-bg p-24 shadow-lg",
          className,
        )}
      >
        {(title || description) && (
          <div className="mb-16 flex flex-col gap-4">
            {title && <h2 className="text-h3 text-fg">{title}</h2>}
            {description && (
              <p className="text-body-sm text-fg-weak">{description}</p>
            )}
          </div>
        )}
        {children && <div className="text-body text-fg">{children}</div>}
        {footer && (
          <div className="mt-24 flex justify-end gap-8">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** 간단 확인 다이얼로그 헬퍼 */
export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  danger,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </>
      }
    />
  );
}
