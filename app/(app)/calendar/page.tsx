import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import {
  CalendarView,
  type CalendarInvoice,
  type CalendarProject,
} from "@/components/calendar/calendar-view";
import type { CalendarEvent, Client, Invoice, Project, Task } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  await requireUser();
  const supabase = createClient();

  const [eventsRes, tasksRes, invoicesRes, projectsRes, clientsRes] = await Promise.all([
    supabase.from("events").select("*").order("start_at", { ascending: true }),
    supabase.from("tasks").select("*").not("due_date", "is", null),
    supabase
      .from("invoices")
      .select("id,number,due_date,client_id,status")
      .not("due_date", "is", null)
      .neq("status", "cancelled"),
    supabase.from("projects").select("id,title,deadline").not("deadline", "is", null),
    supabase.from("clients").select("id,name").order("name"),
  ]);

  const clients = ((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const tasks = ((tasksRes.data ?? []) as Task[]).filter(
    (t) => t.status !== "completed" && t.status !== "cancelled",
  );

  const invoices = ((invoicesRes.data ?? []) as Pick<
    Invoice,
    "id" | "number" | "due_date" | "client_id"
  >[]).map(
    (inv): CalendarInvoice => ({
      id: inv.id,
      number: inv.number,
      due_date: inv.due_date,
      client_name: inv.client_id ? clientMap.get(inv.client_id) ?? null : null,
    }),
  );

  const projects = ((projectsRes.data ?? []) as Pick<Project, "id" | "title" | "deadline">[]).map(
    (p): CalendarProject => ({ id: p.id, title: p.title, deadline: p.deadline }),
  );

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.title }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Events, task due dates, invoice due dates and project deadlines in one place."
      />
      <CalendarView
        events={(eventsRes.data ?? []) as CalendarEvent[]}
        tasks={tasks}
        invoices={invoices}
        projects={projects}
        clients={clients}
        projectOptions={projectOptions}
      />
    </div>
  );
}
