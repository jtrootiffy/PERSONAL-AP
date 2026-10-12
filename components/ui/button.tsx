"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "link";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  default:
    "bg-gradient-to-br from-primary to-gradient-end text-primary-foreground shadow-sm hover:shadow-glow hover:brightness-[1.04] focus-visible:ring-primary/60",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/70 focus-visible:ring-ring",
  outline:
    "border border-border bg-card text-foreground shadow-sm hover:border-primary/30 hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring",
  ghost: "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md focus-visible:ring-destructive/60",
  success:
    "bg-success text-success-foreground shadow-sm hover:bg-success/90 focus-visible:ring-success/60",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

export function buttonVariants({
  variant = "default",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 ease-smooth motion-safe:active:scale-[0.97]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
