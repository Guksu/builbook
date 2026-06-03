import { forwardRef } from "react";
import { cn } from "./cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 에러 상태 (border/ring 을 error 토큰으로) */
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-40 w-full rounded-md border bg-bg px-12 text-body text-fg font-sans",
        "placeholder:text-fg-weak",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        invalid
          ? "border-error focus-visible:ring-error"
          : "border-border focus-visible:border-primary focus-visible:ring-ring",
        "disabled:bg-surface disabled:text-fg-muted disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
