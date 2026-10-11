import * as React from "react";
import { cn, clamp } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
  tone = "primary",
}: {
  value: number;
  className?: string;
  barClassName?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const pct = clamp(Math.round(value), 0, 100);
  const toneClass = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
  }[tone];
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", toneClass, barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
