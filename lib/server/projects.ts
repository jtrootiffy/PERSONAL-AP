import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { autoProjectProgress } from "@/lib/business";
import type { Task } from "@/lib/types";

/**
 * Recompute and persist a project's progress from its tasks.
 * Only applies to projects in "auto" progress mode.
 */
export async function refreshProjectProgress(
  supabase: SupabaseClient,
  projectId: string | null | undefined,
): Promise<void> {
  if (!projectId) return;

  const { data: project } = await supabase
    .from("projects")
    .select("progress_mode")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.progress_mode !== "auto") return;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("status")
    .eq("project_id", projectId);

  const progress = autoProjectProgress((tasks as Pick<Task, "status">[]) ?? []);
  await supabase.from("projects").update({ progress }).eq("id", projectId);
}
