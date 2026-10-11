"use client";

import * as React from "react";
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
  const toast = useToast();
  const [title, setTitle] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const done = subtasks.filter((s) => s.done).length;
  const percent = subtasks.length === 0 ? 0 : Math.round((done / subtasks.length) * 100);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setPending(true);
    const res = await addSubtask(taskId, value);
    setPending(false);
    if (res.ok) setTitle("");
    else toast.error("Could not add subtask", res.error);
  }

  return (
    <div className="space-y-3">
      {subtasks.length > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={percent} className="h-1.5" tone={percent === 100 ? "success" : "primary"} />
          <span className="shrink-0 text-xs text-muted-foreground">
            {done}/{subtasks.length}
          </span>
        </div>
      )}

      <ul className="space-y-1">
        {subtasks.map((s) => (
          <li key={s.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
            <button
              type="button"
              onClick={() => toggleSubtask(s.id, !s.done)}
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border transition-colors",
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
              onClick={() => deleteSubtask(s.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Delete subtask"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
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
