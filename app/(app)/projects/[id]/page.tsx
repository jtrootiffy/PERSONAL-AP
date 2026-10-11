import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import {
  ProjectDetail,
  type ProjectInvoice,
  type ProjectPayment,
  type ProjectTask,
} from "@/components/projects/project-detail";
import type {
  Activity,
  Client,
  Invoice,
  Note,
  Payment,
  Project,
  Subtask,
  Task,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();
  const supabase = createClient();
  const settings = await getSettings();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!project) notFound();

  const [clientRes, tasksRes, invoicesRes, notesRes, activitiesRes, clientsRes, projectsRes] =
    await Promise.all([
      project.client_id
        ? supabase.from("clients").select("*").eq("id", project.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("invoices")
        .select("*")
        .eq("project_id", project.id)
        .order("issue_date", { ascending: false }),
      supabase
        .from("notes")
        .select("*")
        .eq("project_id", project.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("activities")
        .select("*")
        .eq("entity_type", "project")
        .eq("entity_id", project.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("projects").select("id,title").order("title"),
    ]);

  const rawTasks = (tasksRes.data ?? []) as Task[];
  const taskIds = rawTasks.map((t) => t.id);
  let subtasksByTask = new Map<string, Subtask[]>();
  if (taskIds.length > 0) {
    const { data: subtasks } = await supabase
      .from("subtasks")
      .select("*")
      .in("task_id", taskIds)
      .order("sort_order", { ascending: true });
    subtasksByTask = ((subtasks ?? []) as Subtask[]).reduce((map, s) => {
      const list = map.get(s.task_id) ?? [];
      list.push(s);
      map.set(s.task_id, list);
      return map;
    }, new Map<string, Subtask[]>());
  }

  const tasks: ProjectTask[] = rawTasks.map((t) => ({
    ...t,
    subtasks: subtasksByTask.get(t.id) ?? [],
  }));

  const clients = ((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const rawInvoices = (invoicesRes.data ?? []) as Invoice[];
  const invoices: ProjectInvoice[] = rawInvoices.map((inv) => ({
    ...inv,
    client_name: inv.client_id ? clientMap.get(inv.client_id) ?? null : null,
  }));

  const invoiceNumberMap = new Map(rawInvoices.map((i) => [i.id, i.number]));
  let payments: ProjectPayment[] = [];
  if (rawInvoices.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .in(
        "invoice_id",
        rawInvoices.map((i) => i.id),
      )
      .order("paid_on", { ascending: false });
    payments = ((data ?? []) as Payment[]).map((p) => ({
      ...p,
      invoice_number: invoiceNumberMap.get(p.invoice_id) ?? null,
    }));
  }

  const taskProjects = ((projectsRes.data ?? []) as Pick<Project, "id" | "title">[]).map((p) => ({
    id: p.id,
    name: p.title,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>

      <PageHeader title={(project as Project).title} />

      <ProjectDetail
        project={project as Project}
        client={(clientRes.data as Client | null) ?? null}
        tasks={tasks}
        invoices={invoices}
        payments={payments}
        activities={(activitiesRes.data ?? []) as Activity[]}
        notes={(notesRes.data ?? []) as Note[]}
        clients={clients}
        taskProjects={taskProjects}
        currency={settings?.currency ?? "PHP"}
      />
    </div>
  );
}
