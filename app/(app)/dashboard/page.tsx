import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileWarning,
  FolderKanban,
  ListTodo,
  ReceiptText,
  Users,
} from "lucide-react";
import { getProfile, getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/server/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { IncomeChart, ProjectStatusChart, TaskProgressRing } from "@/components/dashboard/charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CountdownBadge,
  InvoiceStatusBadge,
  ProjectStatusBadge,
  TaskStatusBadge,
} from "@/components/common/badges";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatDateTime, monthLabel } from "@/lib/dates";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/constants";
import { effectiveInvoiceStatus } from "@/lib/business";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
  const supabase = createClient();
  const data = await getDashboardData(supabase, user.id, settings);

  const currency = settings?.currency ?? "PHP";
  const cards = { ...DEFAULT_DASHBOARD_CARDS, ...(settings?.dashboard_cards ?? {}) };
  const show = (key: string) => cards[key] !== false;

  const firstName = (profile?.full_name || user.email || "there").split(" ")[0];

  const summary = [
    {
      key: "active_projects",
      label: "Active Projects",
      value: data.stats.activeProjects,
      icon: FolderKanban,
      href: "/projects?status=in_progress",
      tone: "primary" as const,
    },
    {
      key: "completed_projects",
      label: "Completed Projects",
      value: data.stats.completedProjects,
      icon: CheckCircle2,
      href: "/projects?status=completed",
      tone: "success" as const,
    },
    {
      key: "pending_tasks",
      label: "Pending Tasks",
      value: data.stats.pendingTasks,
      icon: ListTodo,
      href: "/tasks?status=todo",
      tone: "default" as const,
    },
    {
      key: "overdue_tasks",
      label: "Overdue Tasks",
      value: data.stats.overdueTasks,
      icon: AlertTriangle,
      href: "/tasks?filter=overdue",
      tone: "danger" as const,
    },
    {
      key: "due_today",
      label: "Tasks Due Today",
      value: data.stats.dueToday,
      icon: CalendarClock,
      href: "/tasks?filter=today",
      tone: "warning" as const,
    },
    {
      key: "clients",
      label: "Total Clients",
      value: data.stats.totalClients,
      icon: Users,
      href: "/clients",
      tone: "default" as const,
    },
    {
      key: "unpaid_invoices",
      label: "Unpaid Invoices",
      value: data.stats.unpaidInvoices,
      icon: FileWarning,
      href: "/invoices?status=unpaid",
      tone: "warning" as const,
    },
    {
      key: "overdue_invoices",
      label: "Overdue Invoices",
      value: data.stats.overdueInvoices,
      icon: ReceiptText,
      href: "/invoices?status=overdue",
      tone: "danger" as const,
    },
    {
      key: "income",
      label: "Income Received",
      value: formatCurrency(data.stats.income, currency),
      icon: Banknote,
      href: "/payments",
      tone: "success" as const,
    },
    {
      key: "outstanding",
      label: "Outstanding Payments",
      value: formatCurrency(data.stats.outstanding, currency),
      icon: CircleDollarSign,
      href: "/invoices?status=unpaid",
      tone: "danger" as const,
    },
  ].filter((c) => show(c.key));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening across your work today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map((c) => (
          <StatCard
            key={c.key}
            label={c.label}
            value={c.value}
            icon={c.icon}
            href={c.href}
            tone={c.tone}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly income</CardTitle>
              <CardDescription>Income received vs. invoiced, last 6 months</CardDescription>
            </div>
            <Link
              href="/reports"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <IncomeChart
              currency={currency}
              data={data.monthlyIncome.map((m) => ({
                label: monthLabel(m.month),
                income: m.income,
                invoiced: m.invoiced,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project status</CardTitle>
            <CardDescription>Distribution of your projects</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectStatusChart data={data.projectStatus} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Task completion</CardTitle>
            <CardDescription>Across all active work</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskProgressRing
              percent={data.taskProgress.percent}
              completed={data.taskProgress.completed}
              total={data.taskProgress.total}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming deadlines</CardTitle>
              <CardDescription>Tasks and projects, soonest first</CardDescription>
            </div>
            <Link
              href="/calendar"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Calendar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <EmptyState
                title="No upcoming deadlines"
                description="Add a due date to a task or project to track it here."
                icon={<CalendarClock className="h-5 w-5" />}
              />
            ) : (
              <ul className="divide-y">
                {data.upcomingDeadlines.map((d) => (
                  <li key={`${d.type}-${d.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      href={d.href}
                      className="flex min-w-0 items-center gap-2 hover:underline"
                    >
                      <Badge tone={d.type === "task" ? "info" : "primary"}>
                        {d.type === "task" ? "Task" : "Project"}
                      </Badge>
                      <span className="truncate text-sm font-medium">{d.title}</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {formatDate(d.date)}
                      </span>
                      <CountdownBadge date={d.date} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Today's tasks</CardTitle>
            <Link href="/tasks" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.todaysTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing is due today. Nice.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.todaysTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm">{t.title}</span>
                    <TaskStatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recently completed</CardTitle>
            <Link href="/tasks?status=completed" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentlyCompleted.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No completed tasks yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.recentlyCompleted.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm line-through decoration-muted-foreground/40">
                      {t.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(t.completed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent projects</CardTitle>
            <Link href="/projects" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentProjects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Create your first project to get started."
                icon={<FolderKanban className="h-5 w-5" />}
                action={{ label: "New project", href: "/projects?new=1" }}
              />
            ) : (
              data.recentProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{p.title}</span>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Progress value={p.progress} className="h-1.5" />
                    <span className="shrink-0 text-xs text-muted-foreground">{p.progress}%</span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest changes in your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.recentActivities.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent invoices</CardTitle>
            <Link href="/invoices" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentInvoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <ul className="divide-y">
                {data.recentInvoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/invoices/${inv.id}`} className="truncate text-sm font-medium hover:underline">
                      {inv.number}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{formatCurrency(inv.total, inv.currency)}</span>
                      <InvoiceStatusBadge status={effectiveInvoiceStatus(inv)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent payments</CardTitle>
            <Link href="/payments" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="divide-y">
                {data.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {formatCurrency(p.amount, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.method || "Payment"} · {formatDate(p.paid_on)}
                      </p>
                    </div>
                    <Link
                      href={`/invoices/${p.invoice_id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View invoice
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
