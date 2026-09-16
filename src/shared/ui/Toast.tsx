"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { cn } from "./cn";

type ToastVariant = "default" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastContextValue {
  /** action이 있으면(예: "되돌리기") 버튼을 함께 보여주고 조금 더 오래 띄운다. */
  toast: (message: string, variant?: ToastVariant, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  default: "bg-fg text-bg",
  success: "bg-success-weak text-success-strong border border-success",
  warning: "bg-warning-weak text-warning-strong border border-warning",
  error: "bg-error-weak text-error-strong border border-error",
};

/**
 * 루트(또는 인증된 레이아웃)에서 한 번 감싼다.
 * 사용: const { toast } = useToast(); toast("저장됨", "success");
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "default", action?: ToastAction) => {
      const id = ++seq.current;
      setItems((prev) => [...prev, { id, message, variant, action }]);
      setTimeout(
        () => {
          setItems((prev) => prev.filter((t) => t.id !== id));
        },
        action ? 6000 : 3000,
      );
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-8"
        role="region"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "flex items-center gap-12 rounded-md px-16 py-12 text-body-sm font-medium shadow-md",
              variantStyles[t.variant],
            )}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  setItems((prev) => prev.filter((x) => x.id !== t.id));
                }}
                className="shrink-0 rounded-sm px-8 py-2 underline underline-offset-2 hover:opacity-80"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast 는 <ToastProvider> 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}
