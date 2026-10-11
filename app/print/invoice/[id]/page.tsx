import { notFound } from "next/navigation";
import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { invoiceBalance } from "@/lib/business";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import type { Client, Invoice, InvoiceItem, Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Standalone invoice document intended for printing / "Save as PDF". It lives
 * outside the (app) layout so no sidebar or topbar is rendered, and the
 * .print-light wrapper forces readable colours regardless of theme.
 */
export default async function InvoicePrintPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const { data: invoiceData } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!invoiceData) notFound();
  const invoice = invoiceData as Invoice;

  const [itemsRes, paymentsRes, clientsRes] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", params.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", params.id)
      .order("paid_on", { ascending: true }),
    invoice.client_id
      ? supabase.from("clients").select("*").eq("id", invoice.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const items = (itemsRes.data ?? []) as InvoiceItem[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const client = (clientsRes.data ?? null) as Client | null;

  const balance = Math.max(invoiceBalance(invoice), 0);
  const dfmt = settings?.date_format || "MMM d, yyyy";
  const currency = invoice.currency;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:p-0">
      <PrintToolbar backHref={`/invoices/${invoice.id}`} />
      <div className="print-light rounded-xl border bg-card p-8 shadow-sm print:rounded-none print:border-0">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-semibold">
              {settings?.business_name?.trim() || "Your business"}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {settings?.business_address || ""}
            </p>
            {(settings?.business_email || settings?.business_phone) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[settings?.business_email, settings?.business_phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl font-bold">{invoice.number}</p>
            <p className="mt-1 text-sm">Issued {formatDate(invoice.issue_date, dfmt)}</p>
            <p className="mt-0.5 text-sm">
              Due {formatDate(invoice.due_date, dfmt)}
            </p>
          </div>
        </div>

        {/* Bill to */}
        <div className="py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bill to
          </p>
          <div className="mt-1.5 text-sm">
            <p className="font-semibold">{client?.name ?? "—"}</p>
            {client?.contact_person && <p>{client.contact_person}</p>}
            {client?.billing_address && (
              <p className="whitespace-pre-line text-muted-foreground">{client.billing_address}</p>
            )}
            {client?.email && <p className="text-muted-foreground">{client.email}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left">
              <th className="py-2 pr-4">Description</th>
              <th className="py-2 pr-4 text-right">Qty</th>
              <th className="py-2 pr-4 text-right">Unit price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-slate-200">
                <td className="py-2.5 pr-4">{it.description || "—"}</td>
                <td className="py-2.5 pr-4 text-right">{Number(it.quantity)}</td>
                <td className="py-2.5 pr-4 text-right">{formatCurrency(it.unit_price, currency)}</td>
                <td className="py-2.5 text-right">{formatCurrency(it.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end pt-4">
          <div className="w-full max-w-[16rem] space-y-1 text-sm sm:w-64">
            <Line label="Subtotal" value={formatCurrency(invoice.subtotal, currency)} />
            {Number(invoice.discount_amount) > 0 && (
              <Line label="Discount" value={`- ${formatCurrency(invoice.discount_amount, currency)}`} />
            )}
            {Number(invoice.tax_amount) > 0 && (
              <Line label="Tax" value={formatCurrency(invoice.tax_amount, currency)} />
            )}
            <div className="flex justify-between border-t border-slate-300 pt-1 font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total, currency)}</span>
            </div>
            {payments.length > 0 && (
              <Line label="Paid" value={formatCurrency(invoice.amount_paid, currency)} />
            )}
            <div className="flex justify-between font-semibold">
              <span>Balance due</span>
              <span>{formatCurrency(balance, currency)}</span>
            </div>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Payments received
            </p>
            <div className="overflow-x-auto">
              <table className="mt-2 w-full min-w-[24rem] text-sm">
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-200">
                      <td className="py-1.5">{formatDate(p.paid_on, dfmt)}</td>
                      <td className="py-1.5 text-muted-foreground">{p.method || "—"}</td>
                      <td className="py-1.5 text-right">{formatCurrency(p.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(invoice.notes || invoice.terms) && (
          <div className="mt-8 space-y-4 border-t pt-4 text-sm">
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms</p>
                <p className="mt-1 whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        <p className="mt-10 border-t pt-3 text-center text-xs text-muted-foreground">
          Thank you for your business.
        </p>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}