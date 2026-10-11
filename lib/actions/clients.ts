"use server";

import { revalidatePath } from "next/cache";
import { clientSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { clientAndUser, fail, dbFail, zodFail, NOT_AUTHENTICATED, type ActionResult } from "./util";
import type { DuplicateClient } from "./types";

function revalidateAll() {
  revalidatePath("/clients");
  revalidatePath("/dashboard");
}

export async function createClientRecord(
  input: unknown,
  opts: { force?: boolean } = {},
): Promise<ActionResult<{ id: string }>> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase, user } = ctx;

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  if (!opts.force) {
    const duplicates = await findDuplicateClients(data.name, data.email);
    if (duplicates.length > 0) {
      return {
        ok: false,
        error: "similar",
        data: { id: duplicates[0].id },
      };
    }
  }

  const { data: created, error } = await supabase
    .from("clients")
    .insert({ ...data, user_id: user.id })
    .select("id")
    .single();

  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "client",
    entityId: created.id,
    action: "created",
    title: `Client added: ${data.name}`,
  });

  revalidateAll();
  return { ok: true, data: { id: created.id } };
}

export async function updateClientRecord(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const { error } = await supabase.from("clients").update(parsed.data).eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "client",
    entityId: id,
    action: "updated",
    title: `Client updated: ${parsed.data.name}`,
  });

  revalidateAll();
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}

export async function setClientArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  const { error } = await supabase
    .from("clients")
    .update({ status: archived ? "archived" : "active" })
    .eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "client",
    entityId: id,
    action: archived ? "archived" : "updated",
    title: archived ? "Client archived" : "Client restored",
  });

  revalidateAll();
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
  const ctx = await clientAndUser();
  if (!ctx) return fail(NOT_AUTHENTICATED);
  const { supabase } = ctx;

  // Invoices/payments are preserved: the FK sets client_id to null, and the
  // financial history stays intact.
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return dbFail(error);

  await logActivity(supabase, {
    entityType: "client",
    entityId: id,
    action: "deleted",
    title: "Client deleted (invoices and payments were kept)",
  });

  revalidateAll();
  return { ok: true };
}

/** Case-insensitive match on name or email, used to warn about duplicates. */
export async function findDuplicateClients(
  name: string,
  email: string | null | undefined,
): Promise<DuplicateClient[]> {
  const ctx = await clientAndUser();
  if (!ctx) return [];
  const { supabase } = ctx;

  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  if (!trimmedName && !trimmedEmail) return [];

  const queries: PromiseLike<{ data: unknown }>[] = [];
  if (trimmedName) {
    queries.push(
      supabase.from("clients").select("id,name,email").ilike("name", trimmedName).limit(5),
    );
  }
  if (trimmedEmail) {
    queries.push(
      supabase.from("clients").select("id,name,email").ilike("email", trimmedEmail).limit(5),
    );
  }

  const results = await Promise.all(queries);
  const merged = new Map<string, DuplicateClient>();
  for (const r of results) {
    for (const row of (r.data as DuplicateClient[]) ?? []) {
      merged.set(row.id, row);
    }
  }
  return Array.from(merged.values());
}
