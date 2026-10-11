import { notFound } from "next/navigation";
import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import type { Invoice, InvoiceItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [invoiceRes, itemsRes, clientsRes, projectsRes] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", params.id)
      .order("sort_order", { ascending: true }),
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("projects").select("id,title").order("title"),
  ]);

  if (!invoiceRes.data) notFound();
  const invoice = invoiceRes.data as Invoice;
  const items = (itemsRes.data ?? []) as InvoiceItem[];

  const clients = ((clientsRes.data ?? []) as { id: string; name: string }[]).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const projects = ((projectsRes.data ?? []) as { id: string; title: string }[]).map((p) => ({
    id: p.id,
    name: p.title,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${invoice.number}`} description="Update the line items, terms or status." />
      <InvoiceEditor
        mode="edit"
        clients={clients}
        projects={projects}
        currency={settings?.currency ?? "PHP"}
        defaultTaxRate={Number(settings?.default_tax_rate ?? 0)}
        paymentTermsDays={settings?.payment_terms_days ?? 14}
        initial={invoice}
        initialItems={items}
      />
    </div>
  );
}
