"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { Button } from "./Button";
import { Input } from "./Input";

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

/**
 * 텍스트 한 줄을 입력받는 다이얼로그 헬퍼.
 * 네이티브 `prompt()` 대체용 — 토큰 기반 UI + IME 안전한 Enter 제출.
 */
export interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  /** 공백 trim 후 비어있지 않은 값만 전달된다 */
  onSubmit: (value: string) => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  /** 열릴 때 채워둘 초깃값 (이름 변경 등) */
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
}

export function PromptModal({
  open,
  onClose,
  onSubmit,
  title,
  description,
  label,
  placeholder,
  initialValue = "",
  confirmText = "확인",
  cancelText = "취소",
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputId = useId();

  // 모달이 열릴 때마다 초깃값으로 리셋 — 이전 입력 잔존/다른 항목 값 노출 방지.
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    onClose();
  };

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
          <Button onClick={submit} disabled={!value.trim()}>
            {confirmText}
          </Button>
        </>
      }
    >
      {label && (
        <label
          htmlFor={inputId}
          className="mb-6 block text-body-sm text-fg-weak"
        >
          {label}
        </label>
      )}
      <Input
        id={inputId}
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // 한글 등 IME 조합 중 Enter는 '조합 확정'이므로 무시(중복 제출 방지).
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
      />
    </Modal>
  );
}
