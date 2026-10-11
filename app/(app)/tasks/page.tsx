import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { TasksView, type TaskRow } from "@/components/tasks/tasks-view";
import type { Subtask, Task } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { view?: string; filter?: string; status?: string; task?: string };
}) {
  await requireUser();
  const supabase = createClient();

  const [tasksRes, subtasksRes, projectsRes, clientsRes] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("subtasks").select("*").order("sort_order", { ascending: true }),
    supabase.from("projects").select("id,title").order("title"),
    supabase.from("clients").select("id,name").order("name"),
  ]);

  const projects = (projectsRes.data ?? []) as { id: string; title: string }[];
  const clients = (clientsRes.data ?? []) as { id: string; name: string }[];
  const projectMap = new Map(projects.map((p) => [p.id, p.title]));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const subtasksByTask = new Map<string, Subtask[]>();
  for (const s of (subtasksRes.data ?? []) as Subtask[]) {
    const arr = subtasksByTask.get(s.task_id) ?? [];
    arr.push(s);
    subtasksByTask.set(s.task_id, arr);
  }

  const tasks = ((tasksRes.data ?? []) as Task[]).map((t) => ({
    ...t,
    project_title: t.project_id ? projectMap.get(t.project_id) ?? null : null,
    client_name: t.client_id ? clientMap.get(t.client_id) ?? null : null,
    subtasks: subtasksByTask.get(t.id) ?? [],
  })) as TaskRow[];

  const view =
    searchParams.view === "board" || searchParams.view === "calendar"
      ? searchParams.view
      : "list";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Everything on your plate — in a list, a board, or a calendar."
      />
      <TasksView
        tasks={tasks}
        projects={projects.map((p) => ({ id: p.id, name: p.title }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        initialView={view}
        initialFilter={searchParams.filter}
        initialStatus={searchParams.status}
        initialTaskId={searchParams.task}
      />
    </div>
  );
}
