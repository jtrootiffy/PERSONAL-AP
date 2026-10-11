"use server";

import { revalidatePath } from "next/cache";
import { addDays, addMonths, addWeeks } from "date-fns";
import { taskSchema, subtaskSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { refreshProjectProgress } from "@/lib/server/projects";
import { parseDate } from "@/lib/dates";
import type { TaskStatus } from "@/lib/types";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

function revalidateAll(projectId?: string | null) {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

function nextOccurrence(due: string | null, recurrence: string): string | null {
  const base = parseDate(due) ?? new Date();
  switch (recurrence) {
    case "daily":
      return addDays(base, 1).toISOString();
    case "weekly":
      return addWeeks(base, 1).toISOString();
    case "monthly":
      return addMonths(base, 1).toISOString();
    default:
      return null;
  }
}

export async function createTask(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const completedAt = data.status === "completed" ? new Date().toISOString() : null;

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({ ...data, completed_at: completedAt, user_id: user.id })
    .select("id")
    .single();
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "task",
    entityId: created.id,
    action: "created",
    title: `Task created: ${data.title}`,
  });
  await refreshProjectProgress(supabase, data.project_id ?? null);

  revalidateAll(data.project_id);
  return { ok: true, data: { id: created.id } };
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { data: existing } = await supabase
    .from("tasks")
    .select("project_id,status,completed_at")
    .eq("id", id)
    .maybeSingle();

  const completedAt =
    data.status === "completed"
      ? existing?.completed_at ?? new Date().toISOString()
      : null;

  const { error } = await supabase
    .from("tasks")
    .update({ ...data, completed_at: completedAt })
    .eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "task",
    entityId: id,
    action: "updated",
    title: `Task updated: ${data.title}`,
  });

  await refreshProjectProgress(supabase, data.project_id ?? null);
  if (existing?.project_id && existing.project_id !== data.project_id) {
    await refreshProjectProgress(supabase, existing.project_id);
  }

  revalidateAll(data.project_id);
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { data: existing } = await supabase
    .from("tasks")
    .select("project_id,title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "task",
    entityId: id,
    action: "deleted",
    title: `Task deleted: ${existing?.title ?? ""}`,
  });

  await refreshProjectProgress(supabase, existing?.project_id ?? null);
  revalidateAll(existing?.project_id);
  return { ok: true };
}

export async function setTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { data: existing } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return fail("Task not found.");

  const nowCompleting = status === "completed" && existing.status !== "completed";

  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "completed" ? existing.completed_at ?? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return dbFail(error);

  // Generate the next occurrence of a recurring task when it is completed.
  if (nowCompleting && existing.recurrence && existing.recurrence !== "none") {
    const nextDue = nextOccurrence(existing.due_date, existing.recurrence);
    const { id: _omit, created_at: _c, updated_at: _u, completed_at: _ca, ...rest } = existing;
    await supabase.from("tasks").insert({
      ...rest,
      status: "todo",
      completed_at: null,
      due_date: nextDue,
      sort_order: (existing.sort_order ?? 0) + 1,
    });
  }

  await logActivity(supabase, {
    entityType: "task",
    entityId: id,
    action: status === "completed" ? "completed" : "status_changed",
    title:
      status === "completed"
        ? `Task completed: ${existing.title}`
        : `Task moved to ${status.replace("_", " ")}: ${existing.title}`,
  });

  await refreshProjectProgress(supabase, existing.project_id);
  revalidateAll(existing.project_id);
  return { ok: true };
}

/** Dragging a card on the Kanban board. */
export async function moveTask(
  id: string,
  status: TaskStatus,
  sortOrder: number,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { data: existing } = await supabase
    .from("tasks")
    .select("project_id,status,title,completed_at")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return fail("Task not found.");

  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      sort_order: sortOrder,
      completed_at:
        status === "completed" ? existing.completed_at ?? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return dbFail(error);

  await refreshProjectProgress(supabase, existing.project_id);
  revalidateAll(existing.project_id);
  return { ok: true };
}

export async function duplicateTask(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const { data: existing } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return fail("Task not found.");

  const { id: _id, created_at: _c, updated_at: _u, completed_at: _ca, ...rest } = existing;
  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      ...rest,
      title: `${existing.title} (copy)`,
      status: "todo",
      completed_at: null,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (error) return dbFail(error);

  // Copy subtasks as well.
  const { data: subs } = await supabase
    .from("subtasks")
    .select("title,sort_order")
    .eq("task_id", id);
  if (subs && subs.length > 0) {
    await supabase.from("subtasks").insert(
      subs.map((s) => ({ ...s, task_id: created.id, done: false, user_id: user.id })),
    );
  }

  await refreshProjectProgress(supabase, existing.project_id);
  revalidateAll(existing.project_id);
  return { ok: true, data: { id: created.id } };
}

// ---------------------------------------------------------------------------
// Subtasks
// ---------------------------------------------------------------------------
export async function addSubtask(
  taskId: string,
  title: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = subtaskSchema.safeParse({ task_id: taskId, title, sort_order: 0 });
  if (!parsed.success) return zodFail(parsed.error);

  const { data: created, error } = await supabase
    .from("subtasks")
    .insert({ task_id: taskId, title: parsed.data.title, user_id: user.id })
    .select("id")
    .single();
  if (error) return dbFail(error);

  revalidatePath("/tasks");
  return { ok: true, data: { id: created.id } };
}

export async function toggleSubtask(
  id: string,
  done: boolean,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("subtasks").update({ done }).eq("id", id);
  if (error) return dbFail(error);
  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteSubtask(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) return dbFail(error);
  revalidatePath("/tasks");
  return { ok: true };
}
