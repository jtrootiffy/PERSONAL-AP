"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/dates";
import {
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
} from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types";

const typeDot: Record<string, string> = {
  deadline: "bg-amber-500",
  overdue: "bg-rose-500",
  payment: "bg-emerald-500",
  project: "bg-indigo-500",
  system: "bg-slate-400",
};

export function NotificationsMenu({
  notifications,
}: {
  notifications: Notification[];
}) {
  const [items, setItems] = React.useState(notifications);
  const unread = items.filter((n) => !n.read).length;

  React.useEffect(() => setItems(notifications), [notifications]);

  async function toggleRead(n: Notification) {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: !x.read } : x)));
    await markNotificationRead(n.id, !n.read);
  }

  async function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await markAllNotificationsRead();
  }

  async function clearAll() {
    setItems([]);
    await clearAllNotifications();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <div className="flex items-center gap-1">
            <button
              onClick={markAll}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Read all
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="max-h-[24rem] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-2.5 border-b px-3 py-2.5 last:border-0",
                  !n.read && "bg-primary/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    typeDot[n.type] ?? "bg-slate-400",
                  )}
                />
                <div className="min-w-0 flex-1">
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="block text-sm font-medium hover:underline"
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{n.title}</p>
                  )}
                  {n.message && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => toggleRead(n)}
                  className="mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title={n.read ? "Mark as unread" : "Mark as read"}
                >
                  <span
                    className={cn(
                      "block h-2 w-2 rounded-full",
                      n.read ? "bg-transparent ring-1 ring-muted-foreground/40" : "bg-primary",
                    )}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
