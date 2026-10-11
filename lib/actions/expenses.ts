"use server";

import { revalidatePath } from "next/cache";
import { expenseSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { formatCurrency } from "@/lib/currency";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

function revalidateAll() {
  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

export async function createExpense(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { data: created, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      name: data.name,
      category: data.category ?? null,
      project_id: data.project_id ?? null,
      expense_date: data.expense_date ?? undefined,
      amount: data.amount,
      notes: data.notes ?? null,
    })
    .select("id")
    .single();
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "expense",
    entityId: created.id,
    action: "created",
    title: `Expense recorded: ${data.name} (${formatCurrency(data.amount)})`,
  });

  revalidateAll();
  return { ok: true, data: { id: created.id } };
}

export async function updateExpense(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { error } = await supabase
    .from("expenses")
    .update({
      name: data.name,
      category: data.category ?? null,
      project_id: data.project_id ?? null,
      expense_date: data.expense_date ?? undefined,
      amount: data.amount,
      notes: data.notes ?? null,
    })
    .eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "expense",
    entityId: id,
    action: "updated",
    title: `Expense updated: ${data.name}`,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "expense",
    entityId: id,
    action: "deleted",
    title: "Expense deleted",
  });

  revalidateAll();
  return { ok: true };
}
