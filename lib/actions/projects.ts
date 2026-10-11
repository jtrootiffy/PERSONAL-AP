"use server";

import { revalidatePath } from "next/cache";
import { projectSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import type { ProjectStatus } from "@/lib/types";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

function revalidateAll(id?: string) {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  if (id) revalidatePath(`/projects/${id}`);
}

export async function createProject(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  // If the deadline is in the past we still allow it, but mark status sensibly.
  const { data: created, error } = await supabase
    .from("projects")
    .insert({ ...data, user_id: user.id })
    .select("id")
    .single();
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "project",
    entityId: created.id,
    action: "created",
    title: `Project created: ${data.title}`,
  });

  revalidateAll(created.id);
  return { ok: true, data: { id: created.id }, redirectTo: `/projects/${created.id}` };
}

export async function updateProject(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { error } = await supabase.from("projects").update(parsed.data).eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "project",
    entityId: id,
    action: "updated",
    title: `Project updated: ${parsed.data.title}`,
  });

  revalidateAll(id);
  return { ok: true };
}

export async function setProjectStatus(
  id: string,
  status: ProjectStatus,
  title?: string,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "project",
    entityId: id,
    action: "status_changed",
    title: `Project status changed to ${PROJECT_STATUS_LABELS[status]}`,
    description: title,
  });

  revalidateAll(id);
  return { ok: true };
}

export async function updateProjectProgress(
  id: string,
  progress: number,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const { error } = await supabase
    .from("projects")
    .update({ progress: clamped, progress_mode: "manual" })
    .eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "project",
    entityId: id,
    action: "updated",
    title: `Progress set to ${clamped}% (manual)`,
  });

  revalidateAll(id);
  return { ok: true };
}

export async function setProjectProgressMode(
  id: string,
  mode: "auto" | "manual",
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase
    .from("projects")
    .update({ progress_mode: mode })
    .eq("id", id);
  if (error) return dbFail(error);

  const { refreshProjectProgress } = await import("@/lib/server/projects");
  await refreshProjectProgress(supabase, id);

  revalidateAll(id);
  return { ok: true };
}

export async function setProjectArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("projects").update({ archived }).eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "project",
    entityId: id,
    action: archived ? "archived" : "updated",
    title: archived ? "Project archived" : "Project restored",
  });

  revalidateAll(id);
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  // Tasks/invoices/expenses keep their history; their project_id becomes null
  // via the FK ON DELETE SET NULL, so financial records are never destroyed.
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "project",
    entityId: id,
    action: "deleted",
    title: "Project deleted (related invoices were preserved)",
  });

  revalidateAll();
  return { ok: true };
}
