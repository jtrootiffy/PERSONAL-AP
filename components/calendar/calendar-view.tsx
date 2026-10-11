"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  FolderKanban,
  CheckSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { EventForm } from "@/components/calendar/event-form";
import { deleteEvent, rescheduleEvent } from "@/lib/actions/events";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, parseDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CalendarEvent, EventType, Task } from "@/lib/types";

export interface CalendarInvoice {
  id: string;
  number: string;
  due_date: string | null;
  client_name: string | null;
}

export interface CalendarProject {
  id: string;
  title: string;
  deadline: string | null;
}

interface CalItem {
  key: string;
  source: "event" | "task" | "invoice" | "project";
  refId: string;
  title: string;
  date: Date;
  allDay: boolean;
  type: EventType;
  href: string;
  event?: CalendarEvent;
}

type ViewMode = "month" | "week" | "day";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  events,
  tasks,
  invoices,
  projects,
  clients,
  projectOptions,
}: {
  events: CalendarEvent[];
  tasks: Task[];
  invoices: CalendarInvoice[];
  projects: CalendarProject[];
  clients: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = React.useState<ViewMode>("month");
  const [cursor, setCursor] = React.useState(new Date());
  const [filters, setFilters] = React.useState({ event: true, task: true, invoice: true, project: true });
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = React.useState<string | undefined>();
  const [detail, setDetail] = React.useState<CalItem | null>(null);
  const [deleting, setDeleting] = React.useState<CalendarEvent | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragKey, setDragKey] = React.useState<string | null>(null);

  const items = React.useMemo<CalItem[]>(() => {
    const list: CalItem[] = [];
    if (filters.event) {
      for (const e of events) {
        const d = parseDate(e.start_at);
        if (!d) continue;
        list.push({
          key: `event:${e.id}`,
          source: "event",
          refId: e.id,
          title: e.title,
          date: d,
          allDay: e.all_day,
          type: e.type,
          href: "#",
          event: e,
        });
      }
    }
    if (filters.task) {
      for (const t of tasks) {
        const d = parseDate(t.due_date);
        if (!d) continue;
        list.push({
          key: `task:${t.id}`,
          source: "task",
          refId: t.id,
          title: t.title,
          date: d,
          allDay: true,
          type: "task",
          href: `/tasks?task=${t.id}`,
        });
      }
    }
    if (filters.invoice) {
      for (const inv of invoices) {
        const d = parseDate(inv.due_date);
        if (!d) continue;
        list.push({
          key: `invoice:${inv.id}`,
          source: "invoice",
          refId: inv.id,
          title: `Invoice ${inv.number}${inv.client_name ? ` · ${inv.client_name}` : ""}`,
          date: d,
          allDay: true,
          type: "invoice_due",
          href: `/invoices/${inv.id}`,
        });
      }
    }
    if (filters.project) {
      for (const p of projects) {
        const d = parseDate(p.deadline);
        if (!d) continue;
        list.push({
          key: `project:${p.id}`,
          source: "project",
          refId: p.id,
          title: `Deadline: ${p.title}`,
          date: d,
          allDay: true,
          type: "project_deadline",
          href: `/projects/${p.id}`,
        });
      }
    }
    return list;
  }, [events, tasks, invoices, projects, filters]);

  const itemsOn = React.useCallback(
    (day: Date) => items.filter((i) => isSameDay(i.date, day)),
    [items],
  );

  function openCreate(day?: Date) {
    setEditing(null);
    setDefaultDate(day ? format(day, "yyyy-MM-dd") : undefined);
    setFormOpen(true);
  }

  function openEdit(e: CalendarEvent) {
    setEditing(e);
    setDefaultDate(undefined);
    setDetail(null);
    setFormOpen(true);
  }

  async function doDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteEvent(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Event deleted");
      setDeleting(null);
      setDetail(null);
      router.refresh();
    } else {
      toast.error("Could not delete event", res.error);
    }
  }

  async function handleDrop(day: Date, item: CalItem) {
    if (item.source !== "event" || !item.event) return;
    const original = parseDate(item.event.start_at);
    if (!original) return;
    const deltaDays = Math.round((day.getTime() - new Date(original).setHours(0, 0, 0, 0)) / 86400000);
    if (deltaDays === 0) return;
    const newStart = item.event.all_day
      ? new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString()
      : addDays(original, deltaDays).toISOString();
    const newEnd = item.event.end_at ? addDays(parseDate(item.event.end_at)!, deltaDays).toISOString() : null;
    const res = await rescheduleEvent(item.event.id, newStart, newEnd);
    if (res.ok) {
      toast.success("Event rescheduled");
      router.refresh();
    } else {
      toast.error("Could not reschedule event", res.error);
    }
  }

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy")
      : view === "week"
        ? `${format(startOfWeek(cursor), "MMM d")} – ${format(addDays(startOfWeek(cursor), 6), "MMM d, yyyy")}`
        : format(cursor, "EEEE, MMMM d, yyyy");

  function step(dir: -1 | 1) {
    setCursor((c) => {
      if (view === "month") return addMonths(c, dir);
      if (view === "week") return addWeeks(c, dir);
      return addDays(c, dir);
    });
  }

  const dayStart = startOfWeek(cursor);
  const weekDays = eachDayOfInterval({ start: dayStart, end: addDays(dayStart, 6) });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border">
            <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["event", "Events"],
              ["task", "Tasks"],
              ["invoice", "Invoices"],
              ["project", "Deadlines"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                filters[key]
                  ? "border-transparent bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
          <div className="flex items-center rounded-lg border">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> New event
          </Button>
        </div>
      </div>

      {view === "month" && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-7 border-b bg-muted/40">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              <MonthGrid
                cursor={cursor}
                itemsOn={itemsOn}
                itemByKey={(key) => items.find((i) => i.key === key)}
                onOpenDay={openCreate}
                onItem={(i) => (i.source === "event" ? setDetail(i) : router.push(i.href))}
                onDrop={handleDrop}
                onDragStart={setDragKey}
              />
            </div>
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="flex min-h-[8rem] flex-col rounded-xl border bg-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const item = items.find((i) => i.key === dragKey);
                if (item) handleDrop(day, item);
                setDragKey(null);
              }}
            >
              <button
                type="button"
                onClick={() => openCreate(day)}
                className={cn(
                  "flex items-center justify-between border-b px-2 py-1.5 text-left text-xs font-medium hover:bg-accent",
                  isToday(day) && "text-primary",
                )}
              >
                <span>{format(day, "EEE d")}</span>
                <Plus className="h-3.5 w-3.5" />
              </button>
              <div className="flex-1 space-y-1 p-1.5">
                {itemsOn(day).map((i) => (
                  <CalChip
                    key={i.key}
                    item={i}
                    draggable={i.source === "event"}
                    onDragStart={setDragKey}
                    onClick={() => (i.source === "event" ? setDetail(i) : router.push(i.href))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "day" && (
        <div className="rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => openCreate(cursor)}
            className="flex w-full items-center justify-between border-b px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <span className={cn(isToday(cursor) && "text-primary")}>{format(cursor, "EEEE, MMMM d")}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Plus className="h-3.5 w-3.5" /> Add event
            </span>
          </button>
          <div className="space-y-2 p-3">
            {itemsOn(cursor).length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title="Nothing scheduled"
                description="Add an event or pick another day."
                action={{ label: "New event", onClick: () => openCreate(cursor) }}
              />
            ) : (
              itemsOn(cursor)
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((i) => (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => (i.source === "event" ? setDetail(i) : router.push(i.href))}
                    className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <span className="h-8 w-1 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLORS[i.type] }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.allDay ? "All day" : formatDateTime(i.date, "h:mm a")} · {EVENT_TYPE_LABELS[i.type]}
                      </p>
                    </div>
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} className="max-w-md">
        {detail && (
          <>
            <ModalHeader>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[detail.type] }}
                />
                <ModalTitle>{detail.title}</ModalTitle>
              </div>
            </ModalHeader>
            <ModalBody className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {detail.allDay ? formatDate(detail.date) : formatDateTime(detail.date)}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="muted">{EVENT_TYPE_LABELS[detail.type]}</Badge>
                <span className="text-xs capitalize text-muted-foreground">{detail.source}</span>
              </div>
              {detail.event?.description && (
                <p className="whitespace-pre-wrap text-muted-foreground">{detail.event.description}</p>
              )}
            </ModalBody>
            <ModalFooter>
              {detail.source !== "event" && (
                <Link href={detail.href} className="mr-auto">
                  <Button variant="outline" size="sm">
                    Open {detail.source}
                  </Button>
                </Link>
              )}
              {detail.event && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleting(detail.event!)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                  <Button size="sm" onClick={() => openEdit(detail.event!)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </Modal>

      <EventForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        clients={clients}
        projects={projectOptions}
        initial={editing}
        defaultDate={defaultDate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete this event?"
        confirmLabel="Delete event"
        description={`"${deleting?.title}" will be permanently removed.`}
      />
    </div>
  );
}

function MonthGrid({
  cursor,
  itemsOn,
  itemByKey,
  onOpenDay,
  onItem,
  onDrop,
  onDragStart,
}: {
  cursor: Date;
  itemsOn: (day: Date) => CalItem[];
  itemByKey: (key: string) => CalItem | undefined;
  onOpenDay: (day: Date) => void;
  onItem: (item: CalItem) => void;
  onDrop: (day: Date, item: CalItem) => void;
  onDragStart: (key: string | null) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(cursor));
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });

  return (
    <div className="grid grid-cols-7">
      {days.map((day, idx) => {
        const dayItems = itemsOn(day);
        const outside = !isSameMonth(day, cursor);
        return (
          <div
            key={day.toISOString()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const key = e.dataTransfer.getData("text/plain");
              const item = itemByKey(key);
              if (item) onDrop(day, item);
            }}
            className={cn(
              "group relative min-h-[6.5rem] border-b border-r p-1.5",
              idx % 7 === 6 && "border-r-0",
              outside && "bg-muted/20",
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday(day) && "bg-primary text-primary-foreground",
                  outside && !isToday(day) && "text-muted-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <button
                type="button"
                onClick={() => onOpenDay(day)}
                className="rounded p-0.5 text-muted-foreground opacity-100 transition-opacity hover:bg-accent group-hover:opacity-100 sm:opacity-0"
                aria-label="Add event"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {dayItems.slice(0, 3).map((i) => (
                <CalChip
                  key={i.key}
                  item={i}
                  compact
                  draggable={i.source === "event"}
                  onDragStart={(k) => {
                    onDragStart(k);
                  }}
                  onClick={() => onItem(i)}
                />
              ))}
              {dayItems.length > 3 && (
                <button
                  type="button"
                  onClick={() => onItem(dayItems[0])}
                  className="px-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  +{dayItems.length - 3} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalChip({
  item,
  compact,
  draggable,
  onDragStart,
  onClick,
}: {
  item: CalItem;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (key: string) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.key);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(item.key);
      }}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md border-l-2 bg-muted/50 px-1.5 py-1 text-left transition-colors hover:bg-accent",
      )}
      style={{ borderLeftColor: EVENT_TYPE_COLORS[item.type] }}
    >
      <span className={cn("truncate text-[11px] font-medium", compact ? "" : "text-sm")}>{item.title}</span>
    </button>
  );
}
