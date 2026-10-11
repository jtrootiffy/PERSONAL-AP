"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  CheckSquare,
  Copy,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Columns3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/common/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal, ModalBody, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { CountdownBadge, PriorityBadge, TaskStatusBadge } from "@/components/common/badges";
import { TaskForm } from "@/components/tasks/task-form";
import { SubtaskList } from "@/components/tasks/subtask-list";
import { useToast } from "@/components/ui/toast";
import {
  deleteTask,
  duplicateTask,
  moveTask,
  setTaskStatus,
} from "@/lib/actions/tasks";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, parseDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { isTaskOverdue, isTaskDueToday } from "@/lib/business";
import type { Subtask, Task, TaskStatus } from "@/lib/types";

export type TaskRow = Task & {
  project_title: string | null;
  client_name: string | null;
  subtasks: Subtask[];
};

interface Option {
  id: string;
  name: string;
}

const PAGE_SIZE = 12;
const BOARD_COLUMNS: TaskStatus[] = ["todo", "in_progress", "in_review", "completed", "cancelled"];

export function TasksView({
  tasks,
  projects,
  clients,
  initialView = "list",
  initialFilter,
  initialStatus,
  initialTaskId,
}: {
  tasks: TaskRow[];
  projects: Option[];
  clients: Option[];
  initialView?: "list" | "board" | "calendar";
  initialFilter?: string;
  initialStatus?: string;
  initialTaskId?: string;
}) {
  const toast = useToast();
  const [view, setView] = React.useState<"list" | "board" | "calendar">(initialView);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(initialStatus ?? "");
  const [priority, setPriority] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [smart, setSmart] = React.useState(initialFilter ?? "");
  const [sort, setSort] = React.useState("due");
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [detail, setDetail] = React.useState<TaskRow | null>(null);
  const [deleting, setDeleting] = React.useState<TaskRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!initialTaskId) return;
    const t = tasks.find((x) => x.id === initialTaskId);
    if (t) setDetail(t);
  }, [initialTaskId, tasks]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = tasks.slice();
    if (status) rows = rows.filter((t) => t.status === status);
    if (priority) rows = rows.filter((t) => t.priority === priority);
    if (projectId) rows = rows.filter((t) => t.project_id === projectId);
    if (smart === "overdue") rows = rows.filter(isTaskOverdue);
    if (smart === "today") rows = rows.filter(isTaskDueToday);
    if (smart === "soon") rows = rows.filter((t) => t.status !== "completed");
    if (q) {
      rows = rows.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.project_title ?? "").toLowerCase().includes(q) ||
          (t.client_name ?? "").toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => {
      if (sort === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }
      if (sort === "created") return b.created_at.localeCompare(a.created_at);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
    return rows;
  }, [tasks, query, status, priority, projectId, smart, sort]);

  React.useEffect(() => setPage(1), [query, status, priority, projectId, smart, sort]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openNew(defaults?: Partial<{ projectId: string; dueDate: string }>) {
    setEditing(null);
    setNewDefaults(defaults ?? {});
    setFormOpen(true);
  }
  const [newDefaults, setNewDefaults] = React.useState<{ projectId?: string; dueDate?: string }>({});

  async function toggleComplete(t: TaskRow) {
    const next = t.status === "completed" ? "todo" : "completed";
    const res = await setTaskStatus(t.id, next as TaskStatus);
    if (res.ok) {
      if (next === "completed") toast.success("Task completed");
    } else {
      toast.error("Could not update task", res.error);
    }
  }

  async function onDuplicate(t: TaskRow) {
    const res = await duplicateTask(t.id);
    if (res.ok) toast.success("Task duplicated");
    else toast.error("Could not duplicate", res.error);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteTask(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Task deleted");
      setDeleting(null);
      setDetail(null);
    } else {
      toast.error("Could not delete task", res.error);
    }
  }

  async function onDrop(status: TaskStatus, id: string) {
    const res = await moveTask(id, status, Date.now() % 100000);
    if (!res.ok) toast.error("Could not move task", res.error);
  }

  const hasFilters = Boolean(query || status || priority || projectId || smart);

  const actionsMenu = (t: TaskRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Task actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => setDetail(t)}>
          <List className="h-4 w-4" /> Details
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setEditing(t);
            setNewDefaults({});
            setFormOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDuplicate(t)}>
          <Copy className="h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => setDeleting(t)}>
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search tasks…" className="lg:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={smart}
            onChange={(e) => setSmart(e.target.value)}
            className="h-9 w-auto min-w-[8.5rem]"
          >
            <option value="">All tasks</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="soon">Open only</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-auto min-w-[8.5rem]">
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 w-auto min-w-[8rem]">
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-9 w-auto min-w-[9rem]">
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 w-auto min-w-[9rem]">
            <option value="due">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="created">Sort: Newest</option>
            <option value="title">Sort: Title</option>
          </Select>
          <div className="flex items-center rounded-lg border">
            {(
              [
                ["list", List],
                ["board", Columns3],
                ["calendar", CalendarDays],
              ] as const
            ).map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn("p-2", view === key ? "text-primary" : "text-muted-foreground")}
                aria-label={`${key} view`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      {view === "list" && (
        <ListView
          tasks={paged}
          empty={filtered.length === 0}
          hasFilters={hasFilters}
          onNew={() => openNew()}
          onToggle={toggleComplete}
          onDetail={setDetail}
          actionsMenu={actionsMenu}
        />
      )}

      {view === "board" && (
        <BoardView tasks={filtered} onDrop={onDrop} onDetail={setDetail} actionsMenu={actionsMenu} />
      )}

      {view === "calendar" && (
        <CalendarView
          tasks={filtered}
          onDayClick={(date) => openNew({ dueDate: `${format(date, "yyyy-MM-dd")}T09:00` })}
          onTaskClick={setDetail}
        />
      )}

      {view === "list" && filtered.length > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      )}

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projects={projects}
        clients={clients}
        initial={editing}
        defaultProjectId={newDefaults.projectId}
        defaultDueDate={newDefaults.dueDate}
      />

      <TaskDetailModal
        task={detail}
        onClose={() => setDetail(null)}
        onEdit={(t) => {
          setDetail(null);
          setEditing(t as Task);
          setNewDefaults({});
          setFormOpen(true);
        }}
        onDelete={(t) => setDeleting(t)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this task?"
        confirmLabel="Delete task"
        description={
          <>
            <strong>{deleting?.title}</strong> and its subtasks will be permanently removed.
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------
function ListView({
  tasks,
  empty,
  hasFilters,
  onNew,
  onToggle,
  onDetail,
  actionsMenu,
}: {
  tasks: TaskRow[];
  empty: boolean;
  hasFilters: boolean;
  onNew: () => void;
  onToggle: (t: TaskRow) => void;
  onDetail: (t: TaskRow) => void;
  actionsMenu: (t: TaskRow) => React.ReactNode;
}) {
  if (empty) {
    return (
      <EmptyState
        icon={<CheckSquare className="h-5 w-5" />}
        title={hasFilters ? "No tasks match your filters" : "No tasks yet"}
        description={
          hasFilters
            ? "Try adjusting the filters or search term."
            : "Create your first task to start tracking your work."
        }
        action={{ label: "New task", onClick: onNew }}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <ul className="divide-y">
        {tasks.map((t) => {
          const overdue = isTaskOverdue(t);
          const dueToday = isTaskDueToday(t);
          const done = t.status === "completed";
          return (
            <li
              key={t.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40",
                overdue && "bg-rose-50/60 dark:bg-rose-950/20",
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(t)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  done
                    ? "border-success bg-success text-success-foreground"
                    : "border-input hover:border-primary",
                )}
                aria-label={done ? "Mark incomplete" : "Mark complete"}
              >
                {done && <Check className="h-3 w-3" />}
              </button>

              <button onClick={() => onDetail(t)} className="min-w-0 flex-1 text-left">
                <span className={cn("block truncate text-sm font-medium", done && "line-through text-muted-foreground")}>
                  {t.title}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {t.project_title && <span>{t.project_title}</span>}
                  {t.subtasks.length > 0 && (
                    <span>
                      {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length} subtasks
                    </span>
                  )}
                  {dueToday && !done && <span className="font-medium text-amber-600">Due today</span>}
                </span>
              </button>

              <div className="hidden items-center gap-2 sm:flex">
                {t.recurrence !== "none" && <Badge tone="info">Recurring</Badge>}
                <PriorityBadge priority={t.priority} />
                {done ? <TaskStatusBadge status={t.status} /> : <CountdownBadge date={t.due_date} />}
              </div>
              {actionsMenu(t)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban board
// ---------------------------------------------------------------------------
function BoardView({
  tasks,
  onDrop,
  onDetail,
  actionsMenu,
}: {
  tasks: TaskRow[];
  onDrop: (status: TaskStatus, id: string) => void;
  onDetail: (t: TaskRow) => void;
  actionsMenu: (t: TaskRow) => React.ReactNode;
}) {
  const [dragOver, setDragOver] = React.useState<TaskStatus | null>(null);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {BOARD_COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col);
            }}
            onDragLeave={() => setDragOver((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/task-id");
              setDragOver(null);
              if (id) onDrop(col, id);
            }}
            className={cn(
              "flex min-h-[140px] flex-col rounded-xl border bg-muted/30 p-2",
              dragOver === col && "border-primary bg-primary/5",
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {TASK_STATUS_LABELS[col]}
              </span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                  className="cursor-grab rounded-lg border bg-card p-2.5 shadow-sm active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-1">
                    <button onClick={() => onDetail(t)} className="min-w-0 flex-1 text-left">
                      <span className="line-clamp-2 text-sm font-medium">{t.title}</span>
                    </button>
                    {actionsMenu(t)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={t.priority} />
                    <CountdownBadge date={t.due_date} showIcon={false} />
                  </div>
                  {t.project_title && (
                    <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{t.project_title}</p>
                  )}
                  {t.subtasks.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Progress
                        value={(t.subtasks.filter((s) => s.done).length / t.subtasks.length) * 100}
                        className="h-1"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar view
// ---------------------------------------------------------------------------
function CalendarView({
  tasks,
  onDayClick,
  onTaskClick,
}: {
  tasks: TaskRow[];
  onDayClick: (date: Date) => void;
  onTaskClick: (t: TaskRow) => void;
}) {
  const [cursor, setCursor] = React.useState(new Date());
  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const days = eachDayOfInterval({ start, end });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function tasksOn(day: Date) {
    return tasks.filter((t) => {
      const d = parseDate(t.due_date);
      return d ? isSameDay(d, day) : false;
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{format(cursor, "MMMM yyyy")}</h3>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setCursor((c) => addMonths(c, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setCursor((c) => addMonths(c, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {weekDays.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayTasks = tasksOn(day);
            const today = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={cn(
                  "flex min-h-[84px] flex-col items-stretch gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/50",
                  !isSameMonth(day, cursor) && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                <span className="flex flex-col gap-0.5">
                  {dayTasks.slice(0, 2).map((t) => (
                    <span
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(t);
                      }}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px]",
                        isTaskOverdue(t)
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
                      )}
                    >
                      {t.title}
                    </span>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayTasks.length - 2} more
                    </span>
                  )}
                </span>
              </button>
            );
          })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------
function TaskDetailModal({
  task,
  onClose,
  onEdit,
  onDelete,
}: {
  task: TaskRow | null;
  onClose: () => void;
  onEdit: (t: TaskRow) => void;
  onDelete: (t: TaskRow) => void;
}) {
  if (!task) return null;
  return (
    <Modal open={Boolean(task)} onClose={onClose} className="max-w-xl">
      <ModalHeader>
        <ModalTitle>{task.title}</ModalTitle>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <CountdownBadge date={task.due_date} />
          {task.recurrence !== "none" && <Badge tone="info">{task.recurrence}</Badge>}
        </div>
      </ModalHeader>
      <ModalBody className="space-y-5">
        {task.description && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
        )}
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Project" value={task.project_title || "—"} />
          <Info label="Client" value={task.client_name || "—"} />
          <Info label="Due" value={task.due_date ? formatDate(task.due_date, "MMM d, yyyy h:mm a") : "—"} />
          <Info
            label="Hours"
            value={`${task.actual_hours ?? 0} / ${task.estimated_hours ?? 0}`}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subtasks
          </p>
          <SubtaskList taskId={task.id} subtasks={task.subtasks} />
        </div>
      </ModalBody>
      <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-6 py-4">
        <Button variant="ghost" className="text-destructive" onClick={() => onDelete(task)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
        <Button onClick={() => onEdit(task)}>
          <Pencil className="h-4 w-4" /> Edit task
        </Button>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}
