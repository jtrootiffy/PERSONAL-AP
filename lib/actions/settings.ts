"use server";

import { revalidatePath } from "next/cache";
import { settingsSchema, profileSchema } from "@/lib/validation";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

export async function updateSettings(input: unknown): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { error } = await supabase
    .from("settings")
    .update(parsed.data)
    .eq("user_id", user.id);
  if (error) return dbFail(error);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  return { ok: true };
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name ?? null,
      avatar_url: parsed.data.avatar_url ?? null,
    })
    .eq("id", user.id);
  if (error) return dbFail(error);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Persist the user's dashboard card visibility preferences. */
export async function updateDashboardCards(
  cards: Record<string, boolean>,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("settings")
    .update({ dashboard_cards: cards })
    .eq("user_id", user.id);
  if (error) return dbFail(error);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
