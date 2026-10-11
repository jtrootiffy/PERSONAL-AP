import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  CLIENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
} from "@/lib/constants";
import type {
  ProjectStatus,
  TaskStatus,
  Priority,
  InvoiceStatus,
  ClientStatus,
  EventType,
} from "@/lib/types";
import { countdown } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={PROJECT_STATUS_TONES[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={TASK_STATUS_TONES[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={PRIORITY_TONES[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={INVOICE_STATUS_TONES[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Badge tone={status === "active" ? "success" : "muted"}>
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function EventTypeDot({ type }: { type: EventType }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: EVENT_TYPE_COLORS[type] }}
      title={EVENT_TYPE_LABELS[type]}
    />
  );
}

const toneClasses = {
  danger: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-sky-600 dark:text-sky-400",
  muted: "text-muted-foreground",
};

export function CountdownBadge({
  date,
  className,
  showIcon = true,
}: {
  date: string | null | undefined;
  className?: string;
  showIcon?: boolean;
}) {
  const c = countdown(date);
  if (c.days === null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        toneClasses[c.tone],
        className,
      )}
    >
      {showIcon && <Clock className="h-3.5 w-3.5" />}
      {c.label}
    </span>
  );
}
