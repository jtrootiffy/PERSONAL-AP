"use server";

import { revalidatePath } from "next/cache";
import { clientAndUser, fail, dbFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

export async function markNotificationRead(
  id: string,
  read: boolean,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("notifications").update({ read }).eq("id", id);
  if (error) return dbFail(error);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) return dbFail(error);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return dbFail(error);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function clearAllNotifications(): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id);
  if (error) return dbFail(error);
  revalidatePath("/dashboard");
  return { ok: true };
}
