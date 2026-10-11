"use server";

import { revalidatePath } from "next/cache";
import { invoiceSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { getSettings } from "@/lib/auth";
import { INVOICE_STATUS_LABELS } from "@/lib/constants";
import type { StoredInvoiceStatus } from "@/lib/types";
import { round2 } from "@/lib/utils";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

function revalidateAll(invoiceId?: string) {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/reports");
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
}

async function generateNumber(): Promise<string> {
  const settings = await getSettings();
  const prefix = settings?.invoice_prefix ?? "INV-";
  const next = settings?.invoice_next_number ?? 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function createInvoice(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const number = data.number?.trim() || (await generateNumber());

  const { data: created, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      number,
      client_id: data.client_id ?? null,
      project_id: data.project_id ?? null,
      issue_date: data.issue_date ?? undefined,
      due_date: data.due_date ?? null,
      currency: data.currency,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      tax_rate: data.tax_rate,
      status: data.status,
      notes: data.notes ?? null,
      terms: data.terms ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" || /duplicate/i.test(error.message)) {
      return fail(`Invoice number "${number}" is already used. Choose another.`);
    }
    return dbFail(error);
  }

  const items = data.items.map((it, idx) => ({
    invoice_id: created.id,
    user_id: user.id,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    amount: round2(it.quantity * it.unit_price),
    sort_order: idx,
  }));
  const { error: itemsError } = await supabase.from("invoice_items").insert(items);
  if (itemsError) {
    await supabase.from("invoices").delete().eq("id", created.id);
    return dbFail(itemsError);
  }

  // Bump the running invoice number when auto-generated.
  if (!data.number?.trim()) {
    const settings = await getSettings();
    if (settings) {
      await supabase
        .from("settings")
        .update({ invoice_next_number: (settings.invoice_next_number ?? 1) + 1 })
        .eq("user_id", user.id);
    }
  }

  await logActivity(supabase, {
    entityType: "invoice",
    entityId: created.id,
    action: "created",
    title: `Invoice ${number} created`,
  });

  revalidateAll(created.id);
  revalidatePath("/settings");
  return { ok: true, data: { id: created.id }, redirectTo: `/invoices/${created.id}` };
}

export async function updateInvoice(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { data: existing } = await supabase
    .from("invoices")
    .select("number")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return fail("Invoice not found.");

  const { error } = await supabase
    .from("invoices")
    .update({
      number: data.number?.trim() || existing.number,
      client_id: data.client_id ?? null,
      project_id: data.project_id ?? null,
      issue_date: data.issue_date ?? undefined,
      due_date: data.due_date ?? null,
      currency: data.currency,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      tax_rate: data.tax_rate,
      status: data.status,
      notes: data.notes ?? null,
      terms: data.terms ?? null,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505" || /duplicate/i.test(error.message)) {
      return fail(`Invoice number "${data.number}" is already used. Choose another.`);
    }
    return dbFail(error);
  }

  // Replace the line items.
  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  const items = data.items.map((it, idx) => ({
    invoice_id: id,
    user_id: user.id,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    amount: round2(it.quantity * it.unit_price),
    sort_order: idx,
  }));
  const { error: itemsError } = await supabase.from("invoice_items").insert(items);
  if (itemsError) return dbFail(itemsError);

  await logActivity(supabase, {
    entityType: "invoice",
    entityId: id,
    action: "updated",
    title: `Invoice ${data.number || existing.number} updated`,
  });

  revalidateAll(id);
  return { ok: true };
}

export async function setInvoiceStatus(
  id: string,
  status: StoredInvoiceStatus,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { data: existing } = await supabase
    .from("invoices")
    .select("number,status")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return fail("Invoice not found.");

  // Cancelling is always allowed; un-cancelling reverts to draft.
  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "invoice",
    entityId: id,
    action: "status_changed",
    title: `Invoice ${existing.number} marked as ${INVOICE_STATUS_LABELS[status]}`,
  });

  revalidateAll(id);
  return { ok: true };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { data: existing } = await supabase
    .from("invoices")
    .select("number")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "invoice",
    entityId: id,
    action: "deleted",
    title: `Invoice ${existing?.number ?? ""} deleted`,
  });

  revalidateAll();
  return { ok: true, redirectTo: "/invoices" };
}
