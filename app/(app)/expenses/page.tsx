import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ExpensesView, type ExpenseRow } from "@/components/expenses/expenses-view";
import type { Expense, Project } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [expensesRes, projectsRes] = await Promise.all([
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("projects").select("id,title").order("title"),
  ]);

  const projects = ((projectsRes.data ?? []) as Pick<Project, "id" | "title">[]).map((p) => ({
    id: p.id,
    name: p.title,
  }));
  const titleMap = new Map(projects.map((p) => [p.id, p.name]));

  const expenses = ((expensesRes.data ?? []) as Expense[]).map((e) => ({
    ...e,
    project_title: e.project_id ? titleMap.get(e.project_id) ?? null : null,
  })) as ExpenseRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track your costs so your profit figures stay honest."
      />
      <ExpensesView expenses={expenses} projects={projects} currency={settings?.currency ?? "PHP"} />
    </div>
  );
}
