import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  FileText,
  FolderKanban,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { getSettings, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ClientStatusBadge,
  CountdownBadge,
  InvoiceStatusBadge,
  ProjectStatusBadge,
} from "@/components/common/badges";
import { ClientActions } from "@/components/clients/client-actions";
import { effectiveInvoiceStatus, invoiceBalance } from "@/lib/business";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatDateTime } from "@/lib/dates";
import { round2 } from "@/lib/utils";
import type { Activity, Client, Invoice, Note, Payment, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();
  const settings = await getSettings();
  const currency = settings?.currency ?? "PHP";
  const supabase = createClient();

  const { data: clientData } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!clientData) notFound();
  const client = clientData as Client;

  const [projectsRes, invoicesRes, notesRes, activitiesRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("*")
      .eq("entity_type", "client")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const projects = (projectsRes.data ?? []) as Project[];
  const invoices = (invoicesRes.data ?? []) as Invoice[];
  const notes = (notesRes.data ?? []) as Note[];
  const activities = (activitiesRes.data ?? []) as Activity[];

  const invoiceIds = invoices.map((i) => i.id);
  const paymentsRes = invoiceIds.length
    ? await supabase
        .from("payments")
        .select("*")
        .in("invoice_id", invoiceIds)
        .order("paid_on", { ascending: false })
    : { data: [] as Payment[] };
  const payments = (paymentsRes.data ?? []) as Payment[];
  const invoiceNumber = new Map(invoices.map((i) => [i.id, i.number]));

  const outstanding = round2(
    invoices
      .filter((i) => i.status !== "cancelled")
      .reduce((a, i) => a + Math.max(invoiceBalance(i), 0), 0),
  );
  const paid = round2(payments.reduce((a, p) => a + Number(p.amount), 0));

  const stats = [
    { label: "Projects", value: String(projects.length), icon: FolderKanban },
    { label: "Invoices", value: String(invoices.length), icon: FileText },
    { label: "Paid", value: formatCurrency(paid, currency), icon: Wallet },
    { label: "Outstanding", value: formatCurrency(outstanding, currency), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar name={client.name} size={36} />
            <span className="truncate">{client.name}</span>
            <ClientStatusBadge status={client.status} />
          </span>
        }
        description={client.company || "Client"}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/invoices/new?client=${client.id}`}>
              <Button size="sm" variant="outline">
                New invoice
              </Button>
            </Link>
            <Link href={`/projects?new=1&client=${client.id}`}>
              <Button size="sm" variant="outline">
                New project
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex justify-end">
        <ClientActions client={client} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-semibold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail icon={<UserIcon className="h-4 w-4" />} label="Contact person" value={client.contact_person} />
            <Detail icon={<Building2 className="h-4 w-4" />} label="Company" value={client.company} />
            <Detail icon={<Mail className="h-4 w-4" />} label="Email" value={client.email} />
            <Detail icon={<Phone className="h-4 w-4" />} label="Phone" value={client.phone} />
            <Detail icon={<MapPin className="h-4 w-4" />} label="Billing address" value={client.billing_address} />
            {client.notes && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Projects</CardTitle>
            <Link href={`/projects?search=${encodeURIComponent(client.name)}`} className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-5 w-5" />}
                title="No projects yet"
                description="Projects linked to this client will appear here."
              />
            ) : (
              <ul className="divide-y">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/projects/${p.id}`} className="min-w-0 truncate text-sm font-medium hover:underline">
                      {p.title}
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <ProjectStatusBadge status={p.status} />
                      <CountdownBadge date={p.deadline} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <Link href="/invoices" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <ul className="divide-y">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/invoices/${inv.id}`} className="truncate text-sm font-medium hover:underline">
                      {inv.number}
                      <span className="ml-2 text-xs text-muted-foreground">{formatDate(inv.issue_date)}</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm">{formatCurrency(inv.total, inv.currency)}</span>
                      <InvoiceStatusBadge status={effectiveInvoiceStatus(inv)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              <ul className="divide-y">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{formatCurrency(p.amount, currency)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.method || "Payment"} · {formatDate(p.paid_on)}
                      </p>
                    </div>
                    <Link
                      href={`/invoices/${p.invoice_id}`}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      {invoiceNumber.get(p.invoice_id) ?? "Invoice"}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No notes for this client.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <StickyNote className="h-4 w-4 text-muted-foreground" />
                      {n.title || "Untitled note"}
                    </p>
                    {n.content && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{n.content}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
