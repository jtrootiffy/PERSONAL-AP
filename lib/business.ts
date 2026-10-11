import type {
  Invoice,
  InvoiceStatus,
  Project,
  Task,
  InvoiceItem,
} from "./types";
import { round2, toNumber } from "./utils";
import { daysFromToday } from "./dates";

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export function invoiceBalance(inv: Pick<Invoice, "total" | "amount_paid">): number {
  return round2(toNumber(inv.total) - toNumber(inv.amount_paid));
}

export function isInvoiceOverdue(
  inv: Pick<Invoice, "status" | "total" | "amount_paid" | "due_date">,
): boolean {
  if (inv.status === "paid" || inv.status === "cancelled") return false;
  if (invoiceBalance(inv) <= 0.001) return false;
  const days = daysFromToday(inv.due_date);
  return days !== null && days < 0;
}

/**
 * The status a user should see. "Overdue" is derived from the due date and the
 * outstanding balance so it is always accurate, never stale.
 */
export function effectiveInvoiceStatus(inv: Invoice): InvoiceStatus {
  if (inv.status === "cancelled") return "cancelled";
  if (inv.status === "paid" || invoiceBalance(inv) <= 0.001) return "paid";
  if (isInvoiceOverdue(inv)) return "overdue";
  return inv.status;
}

export function isInvoicePaid(inv: Invoice): boolean {
  return effectiveInvoiceStatus(inv) === "paid";
}

/** Unpaid = outstanding balance remains (draft/sent/partial/overdue). */
export function isInvoiceUnpaid(inv: Invoice): boolean {
  const s = effectiveInvoiceStatus(inv);
  return s !== "paid" && s !== "cancelled" && invoiceBalance(inv) > 0.001;
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

/** Mirror of the SQL `recalc_invoice` math, for live previews in the UI. */
export function computeInvoiceTotals(input: {
  items: Pick<InvoiceItem, "quantity" | "unit_price" | "amount">[];
  discountType: "none" | "fixed" | "percent";
  discountValue: number;
  taxRate: number;
}): InvoiceTotals {
  const subtotal = round2(
    input.items.reduce(
      (acc, it) =>
        acc + toNumber(it.amount ?? toNumber(it.quantity) * toNumber(it.unit_price)),
      0,
    ),
  );

  let discountAmount = 0;
  if (input.discountType === "percent") {
    discountAmount = round2((subtotal * toNumber(input.discountValue)) / 100);
  } else if (input.discountType === "fixed") {
    discountAmount = round2(Math.min(toNumber(input.discountValue), subtotal));
  }

  const taxable = subtotal - discountAmount;
  const taxAmount = round2((taxable * toNumber(input.taxRate)) / 100);
  const total = Math.max(round2(subtotal - discountAmount + taxAmount), 0);

  return { subtotal, discountAmount, taxAmount, total };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const OPEN_TASK = (t: Pick<Task, "status">) =>
  t.status !== "completed" && t.status !== "cancelled";

/** Progress derived from completed tasks (unweighted percentage). */
export function autoProjectProgress(tasks: Pick<Task, "status">[]): number {
  const active = tasks.filter((t) => t.status !== "cancelled");
  if (active.length === 0) return 0;
  const done = active.filter((t) => t.status === "completed").length;
  return Math.round((done / active.length) * 100);
}

export function resolveProjectProgress(
  project: Pick<Project, "progress" | "progress_mode">,
  tasks: Pick<Task, "status">[],
): number {
  if (project.progress_mode === "manual") return project.progress;
  return autoProjectProgress(tasks);
}

export function isProjectOverdue(
  project: Pick<Project, "status" | "deadline" | "archived">,
): boolean {
  if (project.archived) return false;
  if (project.status === "completed" || project.status === "cancelled") return false;
  const days = daysFromToday(project.deadline);
  return days !== null && days < 0;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function isTaskOpen(t: Pick<Task, "status">): boolean {
  return OPEN_TASK(t);
}

/** Completed tasks are never overdue. */
export function isTaskOverdue(
  t: Pick<Task, "status" | "due_date">,
): boolean {
  if (!OPEN_TASK(t)) return false;
  const days = daysFromToday(t.due_date);
  return days !== null && days < 0;
}

export function isTaskDueToday(t: Pick<Task, "status" | "due_date">): boolean {
  if (!OPEN_TASK(t)) return false;
  return daysFromToday(t.due_date) === 0;
}

export function isTaskDueSoon(
  t: Pick<Task, "status" | "due_date">,
  withinDays = 3,
): boolean {
  if (!OPEN_TASK(t)) return false;
  const days = daysFromToday(t.due_date);
  return days !== null && days >= 0 && days <= withinDays;
}

export function subtaskProgress(
  taskId: string,
  subtasks: { task_id: string; done: boolean }[],
): { done: number; total: number; percent: number } {
  const mine = subtasks.filter((s) => s.task_id === taskId);
  const done = mine.filter((s) => s.done).length;
  const total = mine.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// ---------------------------------------------------------------------------
// Financial aggregates
// ---------------------------------------------------------------------------

export function receivedIncome(
  payments: { amount: number | string }[],
): number {
  return round2(payments.reduce((acc, p) => acc + toNumber(p.amount), 0));
}
