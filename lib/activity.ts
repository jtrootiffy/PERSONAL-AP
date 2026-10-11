import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityAction =
  | "created"
  | "updated"
  | "completed"
  | "deleted"
  | "archived"
  | "payment_recorded"
  | "status_changed"
  | "reminder";

export interface LogActivityInput {
  entityType: string;
  entityId?: string | null;
  action: ActivityAction;
  title: string;
  description?: string | null;
}

/** Append an entry to the activity timeline. Errors here never break the caller. */
export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput,
): Promise<void> {
  try {
    await supabase.from("activities").insert({
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      action: input.action,
      title: input.title,
      description: input.description ?? null,
    });
  } catch {
    // Timeline logging is best-effort.
  }
}
