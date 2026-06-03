import { forwardRef } from "react";
import { cn } from "./cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid, className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-md border bg-bg px-12 py-10 text-body text-fg font-sans leading-relaxed",
        "placeholder:text-fg-weak resize-y",
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
Textarea.displayName = "Textarea";
