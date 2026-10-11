import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { daysFromToday, parseDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/currency";
import type { Settings } from "@/lib/types";

interface NewNotification {
  user_id: string;
  type: "deadline" | "overdue" | "payment" | "project" | "system";
  title: string;
  message: string;
  link: string;
  dedupe_key: string;
}

/**
 * Generate in-app reminders for approaching/overdue project & task deadlines,
 * and overdue invoices. Idempotent thanks to the (user_id, dedupe_key) index:
 * the key includes the due date and a bucketed window, so it re-notifies when a
 * deadline moves but never duplicates on every page load.
 */
export async function generateDeadlineNotifications(
  supabase: SupabaseClient,
  userId: string,
  settings: Settings | null,
): Promise<void> {
  if (settings && settings.notify_in_app === false) return;

  const thresholds = settings?.notify_days_before ?? [7, 3, 1, 0];
  const maxDays = thresholds.length ? Math.max(...thresholds, 0) : 7;
  const currency = settings?.currency ?? "PHP";

  const rows: NewNotification[] = [];

  // --- Tasks ---------------------------------------------------------------
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,title,due_date,status")
    .not("due_date", "is", null)
    .in("status", ["todo", "in_progress", "in_review"])
    .limit(500);

  for (const t of (tasks as { id: string; title: string; due_date: string }[]) ?? []) {
    const days = daysFromToday(t.due_date);
    if (days === null || days > maxDays) continue;
    const overdue = days < 0;
    const bucket = overdue ? "overdue" : String(days);
    const dayPart = format(parseDate(t.due_date)!, "yyyy-MM-dd");
    rows.push({
      user_id: userId,
      type: overdue ? "overdue" : "deadline",
      title: overdue ? `Overdue task: ${t.title}` : `Upcoming task: ${t.title}`,
      message: overdue
        ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
        : days === 0
          ? "Due today"
          : days === 1
            ? "Due tomorrow"
            : `Due in ${days} days`,
      link: `/tasks?task=${t.id}`,
      dedupe_key: `task:${t.id}:${dayPart}:${bucket}`,
    });
  }

  // --- Projects ------------------------------------------------------------
  const { data: projects } = await supabase
    .from("projects")
    .select("id,title,deadline,status,archived")
    .not("deadline", "is", null)
    .eq("archived", false)
    .in("status", ["planning", "not_started", "in_progress", "on_hold"])
    .limit(500);

  for (const p of (projects as { id: string; title: string; deadline: string }[]) ?? []) {
    const days = daysFromToday(p.deadline);
    if (days === null || days > maxDays) continue;
    const overdue = days < 0;
    const bucket = overdue ? "overdue" : String(days);
    const dayPart = format(parseDate(p.deadline)!, "yyyy-MM-dd");
    rows.push({
      user_id: userId,
      type: overdue ? "overdue" : "project",
      title: overdue ? `Project overdue: ${p.title}` : `Project deadline soon: ${p.title}`,
      message: overdue
        ? `Deadline passed ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
        : days === 0
          ? "Deadline is today"
          : `Deadline in ${days} days`,
      link: `/projects/${p.id}`,
      dedupe_key: `project:${p.id}:${dayPart}:${bucket}`,
    });
  }

  // --- Overdue invoices ----------------------------------------------------
  const today = new Date();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id,number,total,amount_paid,currency,due_date,status")
    .not("due_date", "is", null)
    .in("status", ["sent", "partially_paid", "draft"])
    .limit(500);

  for (const inv of (invoices as {
    id: string;
    number: string;
    total: number;
    amount_paid: number;
    currency: string;
    due_date: string;
  }[]) ?? []) {
    const days = daysFromToday(inv.due_date);
    const balance = Number(inv.total) - Number(inv.amount_paid);
    if (days === null || days >= 0 || balance <= 0.001) continue;
    const dayPart = format(parseDate(inv.due_date)!, "yyyy-MM-dd");
    rows.push({
      user_id: userId,
      type: "payment",
      title: `Overdue invoice ${inv.number}`,
      message: `${formatCurrency(balance, inv.currency || currency)} outstanding`,
      link: `/invoices/${inv.id}`,
      dedupe_key: `invoice:${inv.id}:${dayPart}:overdue`,
    });
  }

  if (rows.length > 0) {
    await supabase
      .from("notifications")
      .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
  }
}
