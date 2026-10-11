import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsView, type ProjectRow } from "@/components/projects/projects-view";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string; new?: string };
}) {
  await requireUser();
  const settings = await getSettings();
  const supabase = createClient();

  const [projectsRes, clientsRes] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("clients").select("id,name").order("name", { ascending: true }),
  ]);

  const clients = (clientsRes.data ?? []) as { id: string; name: string }[];
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const projects = ((projectsRes.data ?? []) as Project[]).map((p) => ({
    ...p,
    client_name: p.client_id ? clientMap.get(p.client_id) ?? null : null,
  })) as ProjectRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Plan, track and deliver your work. Click a project to see its details."
      />
      <ProjectsView
        projects={projects}
        clients={clients}
        currency={settings?.currency ?? "PHP"}
        initialNew={searchParams.new === "1"}
        initialStatus={searchParams.status}
      />
    </div>
  );
}
