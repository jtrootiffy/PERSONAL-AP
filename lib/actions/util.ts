import "server-only";

import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import type { ActionResult } from "./types";

export type { ActionResult };

/** Supabase client + the authenticated user, or null when not signed in. */
export async function clientAndUser() {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();
  return { supabase, user };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function zodFail(error: ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Please fix the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/** Postgres/Supabase errors -> friendly message. */
export function dbFail(error: { message?: string; code?: string } | null): ActionResult<never> {
  const message = error?.message ?? "Something went wrong.";
  return { ok: false, error: message };
}

export const NOT_AUTHENTICATED = "Your session has expired. Please sign in again.";
export const NOT_FOUND = "The requested record could not be found.";
