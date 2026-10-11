import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { subMonths } from "date-fns";
import {
  effectiveInvoiceStatus,
  invoiceBalance,
  isInvoiceUnpaid,
  isProjectOverdue,
  isTaskDueToday,
  isTaskOpen,
  isTaskOverdue,
} from "@/lib/business";
import { monthKey, daysFromToday } from "@/lib/dates";
import { round2 } from "@/lib/utils";
import { generateDeadlineNotifications } from "@/lib/server/notifications";
import type {
  Activity,
  CalendarEvent,
  Client,
  Invoice,
  Payment,
  Project,
  Settings,
  Task,
} from "@/lib/types";

export interface DashboardData {
  stats: {
    activeProjects: number;
    completedProjects: number;
    pendingTasks: number;
    overdueTasks: number;
    dueToday: number;
    totalClients: number;
    unpaidInvoices: number;
    overdueInvoices: number;
    income: number;
    outstanding: number;
    invoiced: number;
    expenses: number;
  };
  upcomingDeadlines: {
    id: string;
    title: string;
    type: "task" | "project";
    href: string;
    date: string;
    overdue: boolean;
  }[];
  recentProjects: Project[];
  todaysTasks: Task[];
  recentlyCompleted: Task[];
  recentActivities: Activity[];
  recentInvoices: Invoice[];
  recentPayments: Payment[];
  upcomingEvents: CalendarEvent[];
  monthlyIncome: { month: string; label: string; income: number; invoiced: number }[];
  projectStatus: { status: string; count: number }[];
  taskProgress: { completed: number; total: number; percent: number };
}

export async function getDashboardData(
  supabase: SupabaseClient,
  userId: string,
  settings: Settings | null,
): Promise<DashboardData> {
  await generateDeadlineNotifications(supabase, userId, settings).catch(() => {});

  const [clientsRes, projectsRes, tasksRes, invoicesRes, paymentsRes, expensesRes, activitiesRes, eventsRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("status", "active"),
      supabase.from("projects").select("*"),
      supabase.from("tasks").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("payments").select("*").order("paid_on", { ascending: false }),
      supabase.from("expenses").select("amount,expense_date"),
      supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("events")
        .select("*")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(5),
    ]);

  const clients = (clientsRes.data ?? []) as Client[];
  const projects = (projectsRes.data ?? []) as Project[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const invoices = (invoicesRes.data ?? []) as Invoice[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const expenses = (expensesRes.data ?? []) as { amount: number; expense_date: string }[];
  const activities = (activitiesRes.data ?? []) as Activity[];
  const events = (eventsRes.data ?? []) as CalendarEvent[];

  const nonArchived = projects.filter((p) => !p.archived);
  const activeProjects = nonArchived.filter((p) =>
    ["planning", "not_started", "in_progress", "on_hold"].includes(p.status),
  );
  const completedProjects = nonArchived.filter((p) => p.status === "completed");

  const openTasks = tasks.filter(isTaskOpen);
  const overdueTasks = tasks.filter(isTaskOverdue);
  const dueToday = tasks.filter(isTaskDueToday);
  const pendingTasks = tasks.filter((t) => t.status === "todo");

  const unpaidInvoices = invoices.filter(isInvoiceUnpaid);
  const overdueInvoices = invoices.filter((i) => effectiveInvoiceStatus(i) === "overdue");

  const income = round2(payments.reduce((a, p) => a + Number(p.amount), 0));
  const invoiced = round2(
    invoices.filter((i) => i.status !== "cancelled").reduce((a, i) => a + Number(i.total), 0),
  );
  const outstanding = round2(
    invoices
      .filter((i) => i.status !== "cancelled")
      .reduce((a, i) => a + Math.max(invoiceBalance(i), 0), 0),
  );
  const totalExpenses = round2(expenses.reduce((a, e) => a + Number(e.amount), 0));

  // Upcoming deadlines: open tasks + active projects with a deadline.
  const deadlines = [
    ...openTasks
      .filter((t) => t.due_date)
      .map((t) => ({
        id: t.id,
        title: t.title,
        type: "task" as const,
        href: `/tasks?task=${t.id}`,
        date: t.due_date as string,
        overdue: isTaskOverdue(t),
      })),
    ...activeProjects
      .filter((p) => p.deadline)
      .map((p) => ({
        id: p.id,
        title: p.title,
        type: "project" as const,
        href: `/projects/${p.id}`,
        date: p.deadline as string,
        overdue: isProjectOverdue(p),
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 7);

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const recentlyCompleted = completedTasks
    .slice()
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 5);

  const recentProjects = nonArchived
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  const recentInvoices = invoices
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  // Monthly income for the last 6 months.
  const months: { month: string; label: string; income: number; invoiced: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const key = monthKey(d);
    months.push({ month: key, label: key, income: 0, invoiced: 0 });
  }
  const monthIndex = new Map(months.map((m, i) => [m.month, i]));
  for (const p of payments) {
    const idx = monthIndex.get(monthKey(p.paid_on));
    if (idx !== undefined) months[idx].income = round2(months[idx].income + Number(p.amount));
  }
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    const idx = monthIndex.get(monthKey(inv.issue_date));
    if (idx !== undefined) months[idx].invoiced = round2(months[idx].invoiced + Number(inv.total));
  }

  const statusCounts = new Map<string, number>();
  for (const p of nonArchived) {
    statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1);
  }
  const projectStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const countedTasks = tasks.filter((t) => t.status !== "cancelled");
  const taskProgress = {
    completed: countedTasks.filter((t) => t.status === "completed").length,
    total: countedTasks.length,
    percent:
      countedTasks.length === 0
        ? 0
        : Math.round(
            (countedTasks.filter((t) => t.status === "completed").length / countedTasks.length) * 100,
          ),
  };

  return {
    stats: {
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      dueToday: dueToday.length,
      totalClients: clients.length,
      unpaidInvoices: unpaidInvoices.length,
      overdueInvoices: overdueInvoices.length,
      income,
      outstanding,
      invoiced,
      expenses: totalExpenses,
    },
    upcomingDeadlines: deadlines,
    recentProjects,
    todaysTasks: dueToday.slice(0, 5),
    recentlyCompleted,
    recentActivities: activities,
    recentInvoices,
    recentPayments: payments.slice(0, 5),
    upcomingEvents: events,
    monthlyIncome: months,
    projectStatus,
    taskProgress,
  };
}

export { daysFromToday };
