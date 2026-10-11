"use server";

import { revalidatePath } from "next/cache";
import { noteSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

function revalidateAll() {
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

export async function createNote(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { data: created, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: data.title ?? "",
      content: data.content ?? null,
      project_id: data.project_id ?? null,
      task_id: data.task_id ?? null,
      client_id: data.client_id ?? null,
      pinned: data.pinned,
    })
    .select("id")
    .single();
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "note",
    entityId: created.id,
    action: "created",
    title: `Note added: ${data.title || "Untitled"}`,
  });

  revalidateAll();
  return { ok: true, data: { id: created.id } };
}

export async function updateNote(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { error } = await supabase
    .from("notes")
    .update({
      title: data.title ?? "",
      content: data.content ?? null,
      project_id: data.project_id ?? null,
      task_id: data.task_id ?? null,
      client_id: data.client_id ?? null,
      pinned: data.pinned,
    })
    .eq("id", id);
  if (error) return dbFail(error);

  revalidateAll();
  return { ok: true };
}

export async function toggleNotePin(id: string, pinned: boolean): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("notes").update({ pinned }).eq("id", id);
  if (error) return dbFail(error);
  revalidateAll();
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return dbFail(error);
  revalidateAll();
  return { ok: true };
}
