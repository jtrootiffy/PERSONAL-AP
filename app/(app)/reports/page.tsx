import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsView } from "@/components/reports/reports-view";
import type { Client, Expense, Invoice, Payment, Project } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [paymentsRes, invoicesRes, expensesRes, projectsRes, clientsRes] = await Promise.all([
    supabase.from("payments").select("*").order("paid_on", { ascending: false }),
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("projects").select("id,title,client_id"),
    supabase.from("clients").select("id,name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Income, expenses and profit — export or print any view."
      />
      <ReportsView
        payments={(paymentsRes.data ?? []) as Payment[]}
        invoices={(invoicesRes.data ?? []) as Invoice[]}
        expenses={(expensesRes.data ?? []) as Expense[]}
        projects={(projectsRes.data ?? []) as Pick<Project, "id" | "title" | "client_id">[]}
        clients={((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        currency={settings?.currency ?? "PHP"}
      />
    </div>
  );
}
