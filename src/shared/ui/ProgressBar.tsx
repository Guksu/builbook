import { cn } from "./cn";

export interface ProgressBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  /** 진행률 0..100(%). 범위를 벗어나면 잘라낸다. */
  value: number;
  /** 목표 달성 시 success 토큰으로 채움 색을 바꾼다. */
  reached?: boolean;
}

// 토큰 기반 진행률 바. 트랙은 surface/border, 채움은 primary(달성 시 success).
export function ProgressBar({
  value,
  reached,
  className,
  ...rest
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn(
        "h-6 w-full overflow-hidden rounded-full border border-border bg-surface",
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          reached ? "bg-success" : "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
