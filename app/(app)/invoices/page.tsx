import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { InvoicesView, type InvoiceRow } from "@/components/invoices/invoices-view";
import type { Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; client?: string };
}) {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [invoicesRes, clientsRes] = await Promise.all([
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
    supabase.from("clients").select("id,name"),
  ]);

  const clientMap = new Map(
    ((clientsRes.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );

  const invoices = ((invoicesRes.data ?? []) as Invoice[]).map((inv) => ({
    ...inv,
    client_name: inv.client_id ? clientMap.get(inv.client_id) ?? null : null,
  })) as InvoiceRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Bill your clients, record payments and track what's outstanding."
      />
      <InvoicesView
        invoices={invoices}
        currency={settings?.currency ?? "PHP"}
        initialStatus={searchParams.status}
        initialClientId={searchParams.client}
      />
    </div>
  );
}
