"use client";

import * as React from "react";
import { cn, exitDelay } from "@/lib/utils";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

/** Must match the `toast-out` animation duration in tailwind.config. */
const EXIT_MS = 160;

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** True while the toast is playing its exit animation. */
  closing?: boolean;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Mark the toast as closing so it can play its exit animation, then remove.
  const dismiss = React.useCallback(
    (id: string) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, closing: true } : t)),
      );
      setTimeout(() => remove(id), exitDelay(EXIT_MS));
    },
    [remove],
  );

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "info" }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, title, description, variant }].slice(-4));
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: "success" }),
      error: (title, description) => toast({ title, description, variant: "error" }),
      info: (title, description) => toast({ title, description, variant: "info" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl border border-border/70 bg-card/95 p-3.5 shadow-soft-lg backdrop-blur",
              t.closing ? "pointer-events-none animate-toast-out" : "animate-slide-in",
              t.variant === "success" && "border-l-4 border-l-success",
              t.variant === "error" && "border-l-4 border-l-destructive",
              t.variant === "info" && "border-l-4 border-l-primary",
            )}
          >
            <span className="mt-0.5">
              {t.variant === "success" && (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
              {t.variant === "error" && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              {t.variant === "info" && <Info className="h-5 w-5 text-primary" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
