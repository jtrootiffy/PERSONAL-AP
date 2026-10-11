import {
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = parseISO(value);
  return isNaN(d.getTime()) ? null : d;
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDate(
  value: string | Date | null | undefined,
  fmt = "MMM d, yyyy",
): string {
  const d = parseDate(value);
  return d ? format(d, fmt) : "—";
}

export function formatDateTime(
  value: string | Date | null | undefined,
  fmt = "MMM d, yyyy · h:mm a",
): string {
  const d = parseDate(value);
  return d ? format(d, fmt) : "—";
}

/** Value for an <input type="datetime-local"> (local, no timezone suffix). */
export function toDateTimeLocal(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

export function toDateInput(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? format(d, "yyyy-MM-dd") : "";
}

export function startOfToday(): Date {
  return startOfDay(new Date());
}

export function isToday(value: string | Date | null | undefined): boolean {
  const d = parseDate(value);
  return d ? isSameDay(d, new Date()) : false;
}

export function isPast(value: string | Date | null | undefined): boolean {
  const d = parseDate(value);
  return d ? d.getTime() < Date.now() : false;
}

export function daysFromToday(value: string | Date | null | undefined): number | null {
  const d = parseDate(value);
  if (!d) return null;
  return differenceInCalendarDays(d, new Date());
}

export interface Countdown {
  label: string;
  days: number | null;
  tone: "danger" | "warning" | "info" | "muted";
}

/** Human countdown such as "Due in 3 days", "Due tomorrow", "3 days overdue". */
export function countdown(value: string | Date | null | undefined): Countdown {
  const days = daysFromToday(value);
  if (days === null) return { label: "No due date", days: null, tone: "muted" };
  if (days < 0) {
    const n = Math.abs(days);
    return { label: `${n} day${n === 1 ? "" : "s"} overdue`, days, tone: "danger" };
  }
  if (days === 0) return { label: "Due today", days, tone: "danger" };
  if (days === 1) return { label: "Due tomorrow", days, tone: "warning" };
  if (days <= 3) return { label: `Due in ${days} days`, days, tone: "warning" };
  if (days <= 7) return { label: `Due in ${days} days`, days, tone: "info" };
  return { label: `Due in ${days} days`, days, tone: "muted" };
}

export function monthKey(value: string | Date): string {
  const d = parseDate(value) ?? new Date();
  return format(d, "yyyy-MM");
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, (m ?? 1) - 1, 1), "MMM yyyy");
}

export function rangeStartEnd(start: string, end: string) {
  return { start: startOfDay(parseISO(start)), end: endOfWeek(parseISO(end)) };
}

export { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format };
