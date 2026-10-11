import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const empty = { projects: [], tasks: [], clients: [], invoices: [], notes: [] };
  if (!q) return NextResponse.json(empty);

  const like = `%${q}%`;

  const [projects, tasks, clients, invoices, notes] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,status")
      .ilike("title", like)
      .limit(6),
    supabase
      .from("tasks")
      .select("id,title,status")
      .ilike("title", like)
      .limit(6),
    supabase
      .from("clients")
      .select("id,name,company,email")
      .or(`name.ilike.${like},company.ilike.${like},email.ilike.${like}`)
      .limit(6),
    supabase
      .from("invoices")
      .select("id,number,total,currency")
      .ilike("number", like)
      .limit(6),
    supabase
      .from("notes")
      .select("id,title,content")
      .or(`title.ilike.${like},content.ilike.${like}`)
      .limit(6),
  ]);

  return NextResponse.json({
    projects: (projects.data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.status,
      href: `/projects/${p.id}`,
    })),
    tasks: (tasks.data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.status,
      href: `/tasks?task=${t.id}`,
    })),
    clients: (clients.data ?? []).map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: c.company || c.email || undefined,
      href: `/clients/${c.id}`,
    })),
    invoices: (invoices.data ?? []).map((i) => ({
      id: i.id,
      title: i.number,
      subtitle: `${i.currency} ${Number(i.total).toFixed(2)}`,
      href: `/invoices/${i.id}`,
    })),
    notes: (notes.data ?? []).map((n) => ({
      id: n.id,
      title: n.title || "Untitled note",
      subtitle: (n.content ?? "").slice(0, 60) || undefined,
      href: `/notes`,
    })),
  });
}
