import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "New invoice" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { client?: string; project?: string };
}) {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [clientsRes, projectsRes] = await Promise.all([
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("projects").select("id,title").order("title"),
  ]);

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
      <PageHeader title="New invoice" description="Add line items, set terms and save." />
      <InvoiceEditor
        mode="create"
        clients={clients}
        projects={projects}
        currency={settings?.currency ?? "PHP"}
        defaultTaxRate={Number(settings?.default_tax_rate ?? 0)}
        paymentTermsDays={settings?.payment_terms_days ?? 14}
        defaultClientId={searchParams.client}
        defaultProjectId={searchParams.project}
      />
    </div>
  );
}
