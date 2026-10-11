"use server";

import { revalidatePath } from "next/cache";
import { paymentSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { formatCurrency } from "@/lib/currency";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";

function revalidateAll() {
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/clients");
}

export async function recordPayment(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id,number,total,amount_paid,currency,status,client_id")
    .eq("id", data.invoice_id)
    .maybeSingle();
  if (!invoice) return fail("Invoice not found.");
  if (invoice.status === "cancelled") return fail("Cannot record a payment against a cancelled invoice.");

  const remaining = Number(invoice.total) - Number(invoice.amount_paid);
  if (data.amount > remaining + 0.001) {
    return fail(
      `That exceeds the outstanding balance of ${formatCurrency(remaining, invoice.currency)}. Reduce the amount or record it against another invoice.`,
    );
  }

  const { data: created, error } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      invoice_id: data.invoice_id,
      amount: data.amount,
      paid_on: data.paid_on ?? undefined,
      method: data.method ?? null,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "invoice",
    entityId: data.invoice_id,
    action: "payment_recorded",
    title: `Payment of ${formatCurrency(data.amount, invoice.currency)} recorded for ${invoice.number}`,
  });

  // Notify when the invoice becomes fully paid.
  const { data: refreshed } = await supabase
    .from("invoices")
    .select("status,number")
    .eq("id", data.invoice_id)
    .maybeSingle();
  if (refreshed && refreshed.status === "paid") {
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "payment",
      title: `Invoice ${refreshed.number} fully paid`,
      message: `${formatCurrency(data.amount, invoice.currency)} recorded.`,
      link: `/invoices/${data.invoice_id}`,
      dedupe_key: `paid:${data.invoice_id}:${refreshed.status}`,
    });
    await logActivity(supabase, {
      entityType: "invoice",
      entityId: data.invoice_id,
      action: "status_changed",
      title: `Invoice ${refreshed.number} marked as paid`,
    });
  }

  revalidateAll();
  revalidatePath(`/invoices/${data.invoice_id}`);
  return { ok: true, data: { id: created.id } };
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { data: existing } = await supabase
    .from("payments")
    .select("invoice_id,amount")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) return dbFail(error);

  if (existing) {
    await logActivity(supabase, {
      entityType: "invoice",
      entityId: existing.invoice_id,
      action: "updated",
      title: `Payment removed`,
    });
    revalidatePath(`/invoices/${existing.invoice_id}`);
  }

  revalidateAll();
  return { ok: true };
}
