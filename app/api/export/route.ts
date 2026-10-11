import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invoiceBalance, effectiveInvoiceStatus } from "@/lib/business";
import type { Client, Expense, Invoice, Payment, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = (string | number | null | undefined)[];

function toCsv(headers: string[], rows: Row[]): string {
  const escape = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
}

function inRange(value: string | null | undefined, from: string, to: string): boolean {
  if (!value) return false;
  const d = value.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type") ?? "invoices";
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";

  const stamp = new Date().toISOString().slice(0, 10);

  let headers: string[] = [];
  let rows: Row[] = [];

  if (type === "payments") {
    const [paymentsRes, invoicesRes, clientsRes] = await Promise.all([
      supabase.from("payments").select("*").order("paid_on", { ascending: false }),
      supabase.from("invoices").select("id,number,client_id,currency"),
      supabase.from("clients").select("id,name"),
    ]);
    const invoiceMap = new Map(
      ((invoicesRes.data ?? []) as Pick<Invoice, "id" | "number" | "client_id" | "currency">[]).map(
        (i) => [i.id, i],
      ),
    );
    const clientMap = new Map(
      ((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => [c.id, c.name]),
    );
    headers = ["Date", "Invoice", "Client", "Method", "Reference", "Amount", "Currency", "Notes"];
    rows = ((paymentsRes.data ?? []) as Payment[])
      .filter((p) => inRange(p.paid_on, from, to))
      .map((p) => {
        const inv = invoiceMap.get(p.invoice_id);
        return [
          p.paid_on?.slice(0, 10),
          inv?.number ?? "",
          inv?.client_id ? clientMap.get(inv.client_id) ?? "" : "",
          p.method ?? "",
          p.reference ?? "",
          Number(p.amount).toFixed(2),
          inv?.currency ?? "",
          p.notes ?? "",
        ];
      });
  } else if (type === "expenses") {
    const [expensesRes, projectsRes] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("projects").select("id,title"),
    ]);
    const projectMap = new Map(
      ((projectsRes.data ?? []) as Pick<Project, "id" | "title">[]).map((p) => [p.id, p.title]),
    );
    headers = ["Date", "Name", "Category", "Project", "Amount", "Notes"];
    rows = ((expensesRes.data ?? []) as Expense[])
      .filter((e) => inRange(e.expense_date, from, to))
      .map((e) => [
        e.expense_date?.slice(0, 10),
        e.name,
        e.category ?? "",
        e.project_id ? projectMap.get(e.project_id) ?? "" : "",
        Number(e.amount).toFixed(2),
        e.notes ?? "",
      ]);
  } else if (type === "clients") {
    const [clientsRes, invoicesRes] = await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase.from("invoices").select("client_id,total,amount_paid,status"),
    ]);
    const outstanding = new Map<string, number>();
    const invoiced = new Map<string, number>();
    for (const inv of (invoicesRes.data ?? []) as Pick<
      Invoice,
      "client_id" | "total" | "amount_paid" | "status"
    >[]) {
      if (!inv.client_id || inv.status === "cancelled") continue;
      invoiced.set(inv.client_id, (invoiced.get(inv.client_id) ?? 0) + Number(inv.total));
      outstanding.set(
        inv.client_id,
        (outstanding.get(inv.client_id) ?? 0) + Math.max(invoiceBalance(inv), 0),
      );
    }
    headers = ["Name", "Company", "Email", "Phone", "Status", "Invoiced", "Outstanding"];
    rows = ((clientsRes.data ?? []) as Client[]).map((c) => [
      c.name,
      c.company ?? "",
      c.email ?? "",
      c.phone ?? "",
      c.status,
      (invoiced.get(c.id) ?? 0).toFixed(2),
      (outstanding.get(c.id) ?? 0).toFixed(2),
    ]);
  } else if (type === "projects") {
    const [projectsRes, clientsRes] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id,name"),
    ]);
    const clientMap = new Map(
      ((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => [c.id, c.name]),
    );
    headers = ["Title", "Client", "Status", "Priority", "Progress", "Budget", "Start", "Deadline"];
    rows = ((projectsRes.data ?? []) as Project[]).map((p) => [
      p.title,
      p.client_id ? clientMap.get(p.client_id) ?? "" : "",
      p.status,
      p.priority,
      `${p.progress}%`,
      Number(p.budget ?? 0).toFixed(2),
      p.start_date?.slice(0, 10) ?? "",
      p.deadline?.slice(0, 10) ?? "",
    ]);
  } else {
    const [invoicesRes, clientsRes] = await Promise.all([
      supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
      supabase.from("clients").select("id,name"),
    ]);
    const clientMap = new Map(
      ((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => [c.id, c.name]),
    );
    headers = ["Number", "Client", "Issued", "Due", "Status", "Total", "Paid", "Balance", "Currency"];
    rows = ((invoicesRes.data ?? []) as Invoice[])
      .filter((inv) => inRange(inv.issue_date, from, to))
      .map((inv) => [
        inv.number,
        inv.client_id ? clientMap.get(inv.client_id) ?? "" : "",
        inv.issue_date?.slice(0, 10) ?? "",
        inv.due_date?.slice(0, 10) ?? "",
        effectiveInvoiceStatus(inv),
        Number(inv.total).toFixed(2),
        Number(inv.amount_paid).toFixed(2),
        Math.max(invoiceBalance(inv), 0).toFixed(2),
        inv.currency,
      ]);
  }

  const csv = toCsv(headers, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
