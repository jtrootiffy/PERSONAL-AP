import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Round to 2 decimal places, avoiding floating point noise. */
export function round2(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

/** Build a simple key from a string (used for ids, dedupe keys). */
export function slug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Escape a value for CSV output. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return headers ? headers.join(",") : "";
  const cols = headers ?? Object.keys(rows[0]);
  const head = cols.map(csvCell).join(",");
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(",")).join("\n");
  return `${head}\n${body}`;
}

/** A tiny non-cryptographic id for client-side list keys. */
export function tempId() {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Duration to wait for a CSS exit animation before unmounting.
 * Returns 0 when the user prefers reduced motion, so the element disappears
 * immediately instead of lingering while an (already collapsed) animation
 * "plays".
 */
export function exitDelay(ms: number) {
  if (typeof window === "undefined" || !window.matchMedia) return ms;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
}
