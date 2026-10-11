"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  CircleDollarSign,
  FileText,
  FolderKanban,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  CountdownBadge,
  InvoiceStatusBadge,
  PriorityBadge,
  ProjectStatusBadge,
  TaskStatusBadge,
} from "@/components/common/badges";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectActions } from "@/components/projects/project-actions";
import { TaskForm } from "@/components/tasks/task-form";
import { SubtaskList } from "@/components/tasks/subtask-list";
import {
  RecordPaymentForm,
  type PayableInvoice,
} from "@/components/invoices/record-payment-form";
import { DeletePaymentButton } from "@/components/payments/payment-actions";
import { deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import { effectiveInvoiceStatus, invoiceBalance } from "@/lib/business";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cn, round2 } from "@/lib/utils";
import type { Activity, Client, Invoice, Note, Payment, Project, Subtask, Task } from "@/lib/types";

export interface ProjectTask extends Task {
  subtasks: Subtask[];
}
export interface ProjectInvoice extends Invoice {
  client_name: string | null;
}
export interface ProjectPayment extends Payment {
  invoice_number: string | null;
}

export function ProjectDetail({
  project,
  client,
  tasks,
  invoices,
  payments,
  activities,
  notes,
  clients,
  taskProjects,
  currency,
}: {
  project: Project;
  client: Client | null;
  tasks: ProjectTask[];
  invoices: ProjectInvoice[];
  payments: ProjectPayment[];
  activities: Activity[];
  notes: Note[];
  clients: { id: string; name: string }[];
  taskProjects: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = React.useState("tasks");
  const [editOpen, setEditOpen] = React.useState(false);
  const [taskFormOpen, setTaskFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = React.useState<Task | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [payTarget, setPayTarget] = React.useState<PayableInvoice | null>(null);

  const done = tasks.filter((t) => t.status === "completed").length;
  const open = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;
  const overdue = tasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "cancelled" &&
      t.due_date &&
      new Date(t.due_date).getTime() < Date.now(),
  ).length;

  const income = round2(payments.reduce((a, p) => a + Number(p.amount), 0));
  const invoiced = round2(
    invoices.filter((i) => i.status !== "cancelled").reduce((a, i) => a + Number(i.total), 0),
  );
  const outstanding = round2(
    invoices
      .filter((i) => i.status !== "cancelled")
      .reduce((a, i) => a + Math.max(invoiceBalance(i), 0), 0),
  );

  async function toggleTask(task: Task) {
    const next = task.status === "completed" ? "todo" : "completed";
    const res = await setTaskStatus(task.id, next);
    if (res.ok) router.refresh();
    else toast.error("Could not update task", res.error);
  }

  async function confirmDeleteTask() {
    if (!deletingTask) return;
    setBusy(true);
    const res = await deleteTask(deletingTask.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Task deleted");
      setDeletingTask(null);
      router.refresh();
    } else {
      toast.error("Could not delete task", res.error);
    }
  }

  const stats = [
    { label: "Tasks", value: `${done}/${tasks.length}`, icon: Check },
    { label: "Open", value: String(open), icon: FolderKanban },
    { label: "Overdue", value: String(overdue), icon: CalendarClock },
    { label: "Budget", value: formatCurrency(project.budget, currency), icon: CircleDollarSign },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
          <CountdownBadge date={project.deadline} />
          {project.archived && <Badge tone="muted">Archived</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit project
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null);
              setTaskFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-semibold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks">
              <Card>
                <CardContent className="p-0">
                  {tasks.length === 0 ? (
                    <div className="p-5">
                      <EmptyState
                        icon={<Check className="h-5 w-5" />}
                        title="No tasks yet"
                        description="Break this project down into tasks."
                        action={{ label: "New task", onClick: () => setTaskFormOpen(true) }}
                      />
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {tasks.map((task) => (
                        <li key={task.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleTask(task)}
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                task.status === "completed"
                                  ? "border-success bg-success text-success-foreground"
                                  : "hover:border-primary",
                              )}
                              aria-label="Toggle task"
                            >
                              {task.status === "completed" && <Check className="h-3.5 w-3.5" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setTaskFormOpen(true);
                                  }}
                                  className={cn(
                                    "text-left text-sm font-medium hover:underline",
                                    task.status === "completed" && "text-muted-foreground line-through",
                                  )}
                                >
                                  {task.title}
                                </button>
                                <TaskStatusBadge status={task.status} />
                                <PriorityBadge priority={task.priority} />
                                {task.due_date && <CountdownBadge date={task.due_date} />}
                              </div>
                              {task.description && (
                                <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                              )}
                              {task.subtasks.length > 0 && (
                                <div className="mt-2">
                                  <SubtaskList taskId={task.id} subtasks={task.subtasks} />
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingTask(task)}
                              aria-label="Delete task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardContent className="p-0">
                  {invoices.length === 0 ? (
                    <div className="p-5">
                      <EmptyState
                        icon={<FileText className="h-5 w-5" />}
                        title="No invoices for this project"
                        description="Create an invoice to bill the client."
                        action={{ label: "New invoice", href: `/invoices/new?project=${project.id}` }}
                      />
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {invoices.map((inv) => {
                        const balance = invoiceBalance(inv);
                        return (
                          <li key={inv.id} className="flex items-center justify-between gap-3 p-4">
                            <div className="min-w-0">
                              <Link href={`/invoices/${inv.id}`} className="text-sm font-medium hover:underline">
                                {inv.number}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(inv.issue_date)}
                                {inv.client_name ? ` · ${inv.client_name}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-medium">{formatCurrency(inv.total, inv.currency)}</p>
                                {balance > 0.001 && (
                                  <p className="text-xs text-rose-600 dark:text-rose-400">
                                    {formatCurrency(balance, inv.currency)} due
                                  </p>
                                )}
                              </div>
                              <InvoiceStatusBadge status={effectiveInvoiceStatus(inv)} />
                              {balance > 0.001 && inv.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPayTarget({
                                      id: inv.id,
                                      number: inv.number,
                                      total: Number(inv.total),
                                      amount_paid: Number(inv.amount_paid),
                                      currency: inv.currency,
                                    })
                                  }
                                >
                                  <Wallet className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardContent className="p-0">
                  {payments.length === 0 ? (
                    <div className="p-5">
                      <EmptyState
                        icon={<Wallet className="h-5 w-5" />}
                        title="No payments yet"
                        description="Payments recorded against this project's invoices appear here."
                      />
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {payments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{formatCurrency(p.amount, currency)}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.method || "Payment"} · {formatDate(p.paid_on)}
                              {p.invoice_number ? ` · ${p.invoice_number}` : ""}
                            </p>
                          </div>
                          <DeletePaymentButton paymentId={p.id} amount={Number(p.amount)} currency={currency} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardContent className="p-0">
                  {notes.length === 0 ? (
                    <div className="p-5">
                      <EmptyState
                        icon={<StickyNote className="h-5 w-5" />}
                        title="No notes for this project"
                        description="Keep project notes handy from the Notes page."
                        action={{ label: "Go to notes", href: "/notes" }}
                      />
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {notes.map((n) => (
                        <li key={n.id} className="p-4">
                          <p className="text-sm font-medium">{n.title || "Untitled note"}</p>
                          {n.content && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{n.content}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {activities.map((a) => (
                        <li key={a.id} className="flex gap-3">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <div className="min-w-0">
                            <p className="text-sm">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} tone={project.progress === 100 ? "success" : "primary"} />
                </div>
              </div>
              <Detail label="Client">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="inline-flex items-center gap-1 hover:underline">
                    <Users className="h-3.5 w-3.5" /> {client.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Category">{project.category || "—"}</Detail>
              <Detail label="Start date">{formatDate(project.start_date)}</Detail>
              <Detail label="Deadline">{formatDate(project.deadline)}</Detail>
              <Detail label="Income">{formatCurrency(income, currency)}</Detail>
              <Detail label="Invoiced">{formatCurrency(invoiced, currency)}</Detail>
              <Detail label="Outstanding">
                <span className={outstanding > 0 ? "text-rose-600 dark:text-rose-400" : undefined}>
                  {formatCurrency(outstanding, currency)}
                </span>
              </Detail>
              {project.description && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{project.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectActions project={project} />
            </CardContent>
          </Card>
        </div>
      </div>

      <ProjectForm open={editOpen} onClose={() => setEditOpen(false)} clients={clients} initial={project} />

      <TaskForm
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        projects={taskProjects}
        clients={clients}
        initial={editingTask}
        defaultProjectId={project.id}
      />

      <RecordPaymentForm
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        invoice={payTarget}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={confirmDeleteTask}
        loading={busy}
        title="Delete this task?"
        confirmLabel="Delete task"
        description={`"${deletingTask?.title}" will be permanently removed.`}
      />
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{children}</span>
    </div>
  );
}
