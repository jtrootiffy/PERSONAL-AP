"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { addSubtask, deleteSubtask, toggleSubtask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/lib/types";

export function SubtaskList({
  taskId,
  subtasks,
}: {
  taskId: string;
  subtasks: Subtask[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = React.useState("");
  const [pending, setPending] = React.useState(false);

  // Optimistic local copy so toggles and deletes respond on the first click
  // instead of waiting for the server round-trip, then resync when fresh rows
  // arrive from the server after router.refresh().
  const [items, setItems] = React.useState<Subtask[]>(subtasks);
  React.useEffect(() => setItems(subtasks), [subtasks]);

  const done = items.filter((s) => s.done).length;
  const percent = items.length === 0 ? 0 : Math.round((done / items.length) * 100);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setPending(true);
    const res = await addSubtask(taskId, value);
    setPending(false);
    if (res.ok) {
      setTitle("");
      router.refresh();
    } else {
      toast.error("Could not add subtask", res.error);
    }
  }

  async function toggle(s: Subtask) {
    const next = !s.done;
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: next } : x)));
    const res = await toggleSubtask(s.id, next);
    if (res.ok) {
      router.refresh();
    } else {
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: s.done } : x)));
      toast.error("Could not update subtask", res.error);
    }
  }

  async function remove(s: Subtask) {
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    const res = await deleteSubtask(s.id);
    if (res.ok) {
      router.refresh();
    } else {
      setItems(subtasks);
      toast.error("Could not delete subtask", res.error);
    }
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={percent} className="h-1.5" tone={percent === 100 ? "success" : "primary"} />
          <span className="shrink-0 text-xs text-muted-foreground">
            {done}/{items.length}
          </span>
        </div>
      )}

      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
            <button
              type="button"
              onClick={() => toggle(s)}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded border transition-colors motion-safe:active:scale-95",
                s.done ? "border-primary bg-primary text-primary-foreground" : "border-input",
              )}
              aria-label={s.done ? "Mark incomplete" : "Mark complete"}
            >
              {s.done && <Check className="h-3 w-3" />}
            </button>
            <span className={cn("flex-1 text-sm", s.done && "text-muted-foreground line-through")}>
              {s.title}
            </span>
            <button
              type="button"
              onClick={() => remove(s)}
              className="rounded-md p-1 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Delete subtask"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a subtask…"
          className="h-8"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending || !title.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>
    </div>
  );
}