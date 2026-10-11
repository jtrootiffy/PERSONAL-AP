// Central place to read public configuration so the app can show a friendly
// setup screen instead of crashing when Supabase has not been configured yet.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function looksReal(value: string) {
  return Boolean(value) && !value.includes("your-project-ref") && !value.includes("your-");
}

export function isSupabaseConfigured(): boolean {
  return looksReal(SUPABASE_URL) && looksReal(SUPABASE_ANON_KEY);
}

export const SETUP_TOKEN = process.env.SETUP_TOKEN ?? "";
