import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Settings } from "@/lib/types";

/** The authenticated Supabase user, or null. Memoised per request. */
export const getUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Redirects to /login when there is no session. Use in protected layouts. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile) ?? null;
});

/** Settings row, created lazily if the trigger did not already make one. */
export const getSettings = cache(async (): Promise<Settings | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data) return data as Settings;

  const { data: created } = await supabase
    .from("settings")
    .insert({ user_id: user.id })
    .select("*")
    .maybeSingle();
  return (created as Settings) ?? null;
});

export async function getCurrency(): Promise<string> {
  const settings = await getSettings();
  return settings?.currency ?? "PHP";
}
