import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { CountdownBadge, InvoiceStatusBadge } from "@/components/common/badges";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { DeletePaymentButton } from "@/components/payments/payment-actions";
import { effectiveInvoiceStatus, invoiceBalance } from "@/lib/business";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { clamp, round2 } from "@/lib/utils";
import type { Activity, Client, Invoice, InvoiceItem, Payment, Project } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
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

  const [itemsRes, paymentsRes, clientsRes, projectsRes, activitiesRes] = await Promise.all([
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
    invoice.project_id
      ? supabase.from("projects").select("id,title").eq("id", invoice.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("activities")
      .select("*")
      .eq("entity_type", "invoice")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items = (itemsRes.data ?? []) as InvoiceItem[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const client = (clientsRes.data ?? null) as Client | null;
  const project = (projectsRes.data ?? null) as { id: string; title: string } | null;
  const activities = (activitiesRes.data ?? []) as Activity[];

  const status = effectiveInvoiceStatus(invoice);
  const balance = round2(Math.max(invoiceBalance(invoice), 0));
  const paidPct = Number(invoice.total) > 0 ? clamp((Number(invoice.amount_paid) / Number(invoice.total)) * 100, 0, 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="print-area">
        <CardContent className="space-y-6 p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {settings?.business_name?.trim() || "Your business"}
              </p>
              {settings?.business_address && (
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {settings.business_address}
                </p>
              )}
              {(settings?.business_email || settings?.business_phone) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[settings?.business_email, settings?.business_phone].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="text-left sm:text-right">
              <h2 className="text-2xl font-semibold tracking-tight">{invoice.number}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {status === "overdue" ? "Overdue invoice" : "Invoice"}
              </p>
              <div className="mt-2 flex items-center gap-2 sm:justify-end">
                <InvoiceStatusBadge status={status} />
                <CountdownBadge date={invoice.due_date} />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Meta label="Issue date" value={formatDate(invoice.issue_date, settings?.date_format || "MMM d, yyyy")} />
            <Meta label="Due date" value={formatDate(invoice.due_date, settings?.date_format || "MMM d, yyyy")} />
            <Meta
              label="Client"
              value={
                client ? (
                  <Link href={`/clients/${client.id}`} className="hover:underline">
                    {client.name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Meta
              label="Project"
              value={
                project ? (
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    {project.title}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </div>

          {client && (client.billing_address || client.contact_person) && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Bill to</p>
              {client.contact_person && <p className="mt-1 font-medium">{client.contact_person}</p>}
              <p className="whitespace-pre-line text-muted-foreground">
                {[client.name, client.billing_address].filter(Boolean).join("\n")}
              </p>
            </div>
          )}

          {/* Line items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 pr-4 text-right">Qty</th>
                  <th className="pb-2 pr-4 text-right">Unit price</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">{it.description || "—"}</td>
                    <td className="py-2.5 pr-4 text-right">{Number(it.quantity)}</td>
                    <td className="py-2.5 pr-4 text-right">
                      {formatCurrency(it.unit_price, invoice.currency)}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatCurrency(it.amount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <Row label="Subtotal" value={formatCurrency(invoice.subtotal, invoice.currency)} />
              {Number(invoice.discount_amount) > 0 && (
                <Row label="Discount" value={`- ${formatCurrency(invoice.discount_amount, invoice.currency)}`} />
              )}
              {Number(invoice.tax_amount) > 0 && (
                <Row label="Tax" value={formatCurrency(invoice.tax_amount, invoice.currency)} />
              )}
              <Row label="Total" value={formatCurrency(invoice.total, invoice.currency)} strong />
              <Row label="Paid" value={formatCurrency(invoice.amount_paid, invoice.currency)} />
              <div className="flex items-center justify-between border-t pt-1 font-semibold">
                <span className={balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-success"}>
                  {balance > 0 ? "Balance due" : "Fully paid"}
                </span>
                <span>{formatCurrency(balance, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {Number(invoice.total) > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Payment progress</span>
                <span>{Math.round(paidPct)}%</span>
              </div>
              <Progress value={paidPct} tone={paidPct >= 100 ? "success" : "primary"} />
            </div>
          )}

          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {invoice.notes && (
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Terms</p>
                  <p className="mt-1 whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="no-print space-y-6">
        <div className="flex justify-end">
          <InvoiceActions invoice={invoice} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{formatCurrency(p.amount, invoice.currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.method || "Payment"} · {formatDate(p.paid_on)}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </p>
                        {p.notes && <p className="mt-0.5 text-xs text-muted-foreground">{p.notes}</p>}
                      </div>
                      <DeletePaymentButton
                        paymentId={p.id}
                        amount={Number(p.amount)}
                        currency={invoice.currency}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-5 w-5" />}
                  title="No activity yet"
                  description="Changes to this invoice will appear here."
                />
              ) : (
                <ul className="space-y-3">
                  {activities.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(a.created_at, "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${strong ? "font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={strong ? "text-foreground" : undefined}>{value}</span>
    </div>
  );
}