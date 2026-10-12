"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn, exitDelay } from "@/lib/utils";
import { X } from "lucide-react";

/** Must match the `zoom-out` / `fade-out` animation duration in tailwind.config. */
const EXIT_MS = 160;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** Prevent closing when clicking the backdrop. */
  dismissable?: boolean;
}

export function Modal({
  open,
  onClose,
  children,
  className,
  dismissable = true,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [rendered, setRendered] = React.useState(open);
  const [closing, setClosing] = React.useState(false);
  const hasRendered = React.useRef(false);
  React.useEffect(() => setMounted(true), []);

  // Keep the panel mounted through its exit animation.
  React.useEffect(() => {
    if (open) {
      hasRendered.current = true;
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!hasRendered.current) return;
    setClosing(true);
    const t = setTimeout(() => {
      setClosing(false);
      setRendered(false);
      hasRendered.current = false;
    }, exitDelay(EXIT_MS));
    return () => clearTimeout(t);
  }, [open]);

  // Lock scroll + handle Escape while the dialog is on screen (including exit).
  React.useEffect(() => {
    if (!rendered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissable) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [rendered, onClose, dismissable]);

  if (!mounted || !rendered) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className={cn(
          "fixed inset-0 bg-slate-950/40 backdrop-blur-sm",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
        onClick={dismissable ? onClose : undefined}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 my-8 w-full max-w-lg rounded-card border border-border/70 bg-card p-0 shadow-soft-lg",
          closing ? "pointer-events-none animate-zoom-out" : "animate-zoom-in",
          className,
        )}
      >
        {dismissable && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("border-b px-6 py-4 pr-12", className)}>{children}</div>;
}

export function ModalTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className={cn("text-base font-semibold tracking-tight", className)}>
      {children}
    </h2>
  );
}

export function ModalDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("mt-1 text-sm text-muted-foreground", className)}>{children}</p>
  );
}

export function ModalBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("max-h-[65vh] overflow-y-auto px-6 py-4", className)}>{children}</div>;
}

export function ModalFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
