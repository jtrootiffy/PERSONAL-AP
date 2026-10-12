"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface Ctx {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: { current: HTMLElement | null };
}
const DropdownCtx = React.createContext<Ctx | null>(null);

/**
 * Simple dropdown menu. The content is rendered through a portal to
 * document.body and positioned from the trigger's screen coordinates, so it
 * is never clipped by an ancestor `overflow` (e.g. the overflow-x-auto tables
 * used on the invoices/expenses pages) and always stays inside the viewport.
 */
export function DropdownMenu({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  return (
    <DropdownCtx.Provider value={{ open, setOpen, triggerRef }}>
      <div className={cn("inline-block text-left", className)}>{children}</div>
    </DropdownCtx.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const ctx = React.useContext(DropdownCtx)!;
  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture the actual DOM node (works for asChild children too) so the
    // portal content can be positioned from its bounding rect.
    ctx.triggerRef.current = e.currentTarget;
    ctx.setOpen((v) => !v);
  };
  const triggerProps = {
    onClick,
    "aria-haspopup": "menu" as const,
    "aria-expanded": ctx.open,
  };
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      triggerProps,
    );
  }
  return (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const ctx = React.useContext(DropdownCtx)!;
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  // Position the menu once it is mounted and keep it glued to the trigger
  // while scrolling (capture phase catches scrolls of any ancestor, including
  // the tables' own overflow-x-auto) or resizing.
  React.useLayoutEffect(() => {
    if (!ctx.open) return;
    const el = contentRef.current;
    const trigger = ctx.triggerRef.current;
    if (!el || !trigger) return;

    const place = () => {
      const r = trigger.getBoundingClientRect();
      const width = el.offsetWidth || 200;
      const height = el.offsetHeight || 0;
      const margin = 4;
      const spaceBelow = window.innerHeight - r.bottom - margin;
      const spaceAbove = r.top - margin;
      const openUp = spaceBelow < height + margin && spaceAbove > spaceBelow;
      const top = openUp ? Math.max(8, r.top - height - margin) : r.bottom + margin;
      let left = align === "end" ? r.right - width : r.left;
      left = Math.max(8, Math.min(left, Math.max(8, window.innerWidth - width - 8)));
      setPos({ top, left, maxHeight: Math.max(spaceBelow, spaceAbove) - 8 });
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [ctx.open, align]);

  // Close on outside press or Escape.
  React.useEffect(() => {
    if (!ctx.open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (contentRef.current?.contains(t)) return;
      if (ctx.triggerRef.current?.contains(t)) return;
      ctx.setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctx.open]);

  if (!ctx.open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      style={
        pos
          ? { position: "fixed", top: pos.top, left: pos.left, maxHeight: pos.maxHeight, overflowY: "auto" }
          : { position: "fixed", top: -9999, left: -9999 }
      }
      className={cn(
        "z-50 min-w-[11rem] overflow-hidden rounded-2xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-soft-lg animate-slide-in-down",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  className,
  destructive,
  disabled,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  className?: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const ctx = React.useContext(DropdownCtx)!;
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        ctx.setOpen(false);
        onSelect?.();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
      {children}
    </div>
  );
}