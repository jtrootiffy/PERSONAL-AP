import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { NotesView, type NoteRow } from "@/components/notes/notes-view";
import type { Client, Note, Project, Task } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notes" };

export default async function NotesPage() {
  await requireUser();
  const supabase = createClient();

  const [notesRes, projectsRes, clientsRes, tasksRes] = await Promise.all([
    supabase.from("notes").select("*").order("updated_at", { ascending: false }),
    supabase.from("projects").select("id,title").order("title"),
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("tasks").select("id,title").order("title"),
  ]);

  const projects = ((projectsRes.data ?? []) as Pick<Project, "id" | "title">[]).map((p) => ({
    id: p.id,
    name: p.title,
  }));
  const clients = ((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const tasks = ((tasksRes.data ?? []) as Pick<Task, "id" | "title">[]).map((t) => ({
    id: t.id,
    name: t.title,
  }));

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const taskMap = new Map(tasks.map((t) => [t.id, t.name]));

  const notes = ((notesRes.data ?? []) as Note[]).map((n) => ({
    ...n,
    project_title: n.project_id ? projectMap.get(n.project_id) ?? null : null,
    client_name: n.client_id ? clientMap.get(n.client_id) ?? null : null,
    task_title: n.task_id ? taskMap.get(n.task_id) ?? null : null,
  })) as NoteRow[];

  return (
    <div className="space-y-6">
      <PageHeader title="Notes" description="Ideas, meeting notes and anything worth remembering." />
      <NotesView notes={notes} projects={projects} clients={clients} tasks={tasks} />
    </div>
  );
}
