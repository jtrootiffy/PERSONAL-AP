import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getUser();
  redirect(user ? "/dashboard" : "/login");
}
