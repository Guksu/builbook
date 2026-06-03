import { forwardRef } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** true 면 가로 100% 채움 */
  block?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-8 rounded-md font-sans font-medium " +
  "transition-colors select-none whitespace-nowrap " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "bg-surface text-fg border border-border hover:border-border-strong hover:bg-bg",
  ghost: "bg-transparent text-fg hover:bg-surface",
  danger: "bg-error text-primary-fg hover:bg-error-strong",
};

const sizes: Record<Size, string> = {
  sm: "h-32 px-12 text-body-sm",
  md: "h-40 px-16 text-body",
  lg: "h-48 px-24 text-body-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", block, className, type, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
