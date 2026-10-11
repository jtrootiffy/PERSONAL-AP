"use server";

import { revalidatePath } from "next/cache";
import { eventSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

function revalidateAll() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createEvent(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { data: created, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      start_at: data.start_at,
      end_at: data.end_at ?? null,
      all_day: data.all_day,
      client_id: data.client_id ?? null,
      project_id: data.project_id ?? null,
    })
    .select("id")
    .single();
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "event",
    entityId: created.id,
    action: "created",
    title: `Event created: ${data.title}`,
  });

  revalidateAll();
  return { ok: true, data: { id: created.id } };
}

export async function updateEvent(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { error } = await supabase
    .from("events")
    .update({
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      start_at: data.start_at,
      end_at: data.end_at ?? null,
      all_day: data.all_day,
      client_id: data.client_id ?? null,
      project_id: data.project_id ?? null,
    })
    .eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "event",
    entityId: id,
    action: "updated",
    title: `Event updated: ${data.title}`,
  });

  revalidateAll();
  return { ok: true };
}

/** Drag & drop reschedule: shift the event by a day/time delta. */
export async function rescheduleEvent(
  id: string,
  startAt: string,
  endAt: string | null,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase
    .from("events")
    .update({ start_at: startAt, end_at: endAt })
    .eq("id", id);
  if (error) return dbFail(error);

  revalidateAll();
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "event",
    entityId: id,
    action: "deleted",
    title: "Event deleted",
  });

  revalidateAll();
  return { ok: true };
}
