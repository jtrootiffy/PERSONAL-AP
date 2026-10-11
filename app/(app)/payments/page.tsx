import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentsView, type PaymentRow } from "@/components/payments/payments-view";
import type { PayableInvoice } from "@/components/invoices/record-payment-form";
import { invoiceBalance } from "@/lib/business";
import type { Client, Invoice, Payment } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [paymentsRes, invoicesRes, clientsRes] = await Promise.all([
    supabase.from("payments").select("*").order("paid_on", { ascending: false }),
    supabase
      .from("invoices")
      .select("id,number,client_id,currency,total,amount_paid,status,due_date"),
    supabase.from("clients").select("id,name"),
  ]);

  const invoices = (invoicesRes.data ?? []) as Pick<
    Invoice,
    "id" | "number" | "client_id" | "currency" | "total" | "amount_paid" | "status" | "due_date"
  >[];
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
  const clientMap = new Map(
    ((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => [c.id, c.name]),
  );

  const payments = ((paymentsRes.data ?? []) as Payment[]).map((p) => {
    const inv = invoiceMap.get(p.invoice_id);
    return {
      ...p,
      invoice_number: inv?.number ?? null,
      client_name: inv?.client_id ? clientMap.get(inv.client_id) ?? null : null,
      currency: inv?.currency ?? settings?.currency ?? "PHP",
    };
  }) as PaymentRow[];

  const unpaidInvoices: PayableInvoice[] = invoices
    .filter((inv) => inv.status !== "cancelled" && invoiceBalance(inv) > 0.001)
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      total: Number(inv.total),
      amount_paid: Number(inv.amount_paid),
      currency: inv.currency,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Every recorded payment — this is what counts as income."
      />
      <PaymentsView
        payments={payments}
        unpaidInvoices={unpaidInvoices}
        currency={settings?.currency ?? "PHP"}
      />
    </div>
  );
}
