import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ClientsView, type ClientRow } from "@/components/clients/clients-view";
import { invoiceBalance } from "@/lib/business";
import { round2 } from "@/lib/utils";
import type { Client, Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
    supabase.from("clients").select("*").order("name", { ascending: true }),
    supabase.from("projects").select("client_id"),
    supabase.from("invoices").select("client_id,total,amount_paid,status"),
  ]);

  const projectCounts = new Map<string, number>();
  for (const p of (projectsRes.data ?? []) as { client_id: string | null }[]) {
    if (!p.client_id) continue;
    projectCounts.set(p.client_id, (projectCounts.get(p.client_id) ?? 0) + 1);
  }

  const invoiceCounts = new Map<string, number>();
  const outstanding = new Map<string, number>();
  for (const inv of (invoicesRes.data ?? []) as Pick<
    Invoice,
    "client_id" | "total" | "amount_paid" | "status"
  >[]) {
    if (!inv.client_id) continue;
    invoiceCounts.set(inv.client_id, (invoiceCounts.get(inv.client_id) ?? 0) + 1);
    if (inv.status !== "cancelled") {
      const balance = Math.max(invoiceBalance(inv), 0);
      outstanding.set(inv.client_id, round2((outstanding.get(inv.client_id) ?? 0) + balance));
    }
  }

  const clients = ((clientsRes.data ?? []) as Client[]).map((c) => ({
    ...c,
    project_count: projectCounts.get(c.id) ?? 0,
    invoice_count: invoiceCounts.get(c.id) ?? 0,
    outstanding: outstanding.get(c.id) ?? 0,
  })) as ClientRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Your customers, their projects and what they owe."
      />
      <ClientsView
        clients={clients}
        currency={settings?.currency ?? "PHP"}
        initialStatus={searchParams.status}
      />
    </div>
  );
}
