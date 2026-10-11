"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleSlash,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Send,
  Trash2,
  Undo2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/common/search-input";
import { CountdownBadge, InvoiceStatusBadge } from "@/components/common/badges";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from "@/components/ui/table";
import {
  RecordPaymentForm,
  type PayableInvoice,
} from "@/components/invoices/record-payment-form";
import { deleteInvoice, setInvoiceStatus } from "@/lib/actions/invoices";
import {
  effectiveInvoiceStatus,
  invoiceBalance,
  isInvoiceUnpaid,
} from "@/lib/business";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { cn, round2 } from "@/lib/utils";
import type { Invoice, StoredInvoiceStatus } from "@/lib/types";

export type InvoiceRow = Invoice & { client_name: string | null };

const PAGE_SIZE = 12;

export function InvoicesView({
  invoices,
  currency,
  initialStatus,
  initialClientId,
}: {
  invoices: InvoiceRow[];
  currency: string;
  initialStatus?: string;
  initialClientId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(initialStatus ?? "");
  const [clientId, setClientId] = React.useState(initialClientId ?? "");
  const [page, setPage] = React.useState(1);

  const [payTarget, setPayTarget] = React.useState<PayableInvoice | null>(null);
  const [deleting, setDeleting] = React.useState<InvoiceRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const clients = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoices) {
      if (inv.client_id && inv.client_name) map.set(inv.client_id, inv.client_name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [invoices]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = invoices.slice();
    if (clientId) rows = rows.filter((i) => i.client_id === clientId);
    if (status === "unpaid") rows = rows.filter(isInvoiceUnpaid);
    else if (status) rows = rows.filter((i) => effectiveInvoiceStatus(i) === status);
    if (q) {
      rows = rows.filter(
        (i) =>
          i.number.toLowerCase().includes(q) ||
          (i.client_name ?? "").toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.issue_date.localeCompare(a.issue_date) || b.created_at.localeCompare(a.created_at));
    return rows;
  }, [invoices, query, status, clientId]);

  React.useEffect(() => setPage(1), [query, status, clientId]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = filtered.reduce(
    (acc, inv) => {
      if (inv.status === "cancelled") return acc;
      acc.total = round2(acc.total + Number(inv.total));
      acc.paid = round2(acc.paid + Number(inv.amount_paid));
      acc.outstanding = round2(acc.outstanding + Math.max(invoiceBalance(inv), 0));
      return acc;
    },
    { total: 0, paid: 0, outstanding: 0 },
  );

  async function changeStatus(inv: InvoiceRow, next: StoredInvoiceStatus) {
    const res = await setInvoiceStatus(inv.id, next);
    if (res.ok) {
      toast.success(`Invoice marked as ${INVOICE_STATUS_LABELS[next]}`);
      router.refresh();
    } else {
      toast.error("Could not update invoice", res.error);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteInvoice(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Invoice deleted");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error("Could not delete invoice", res.error);
    }
  }

  const hasFilters = Boolean(query || status || clientId);

  const actionsMenu = (inv: InvoiceRow) => {
    const eff = effectiveInvoiceStatus(inv);
    const balance = invoiceBalance(inv);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Invoice actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => router.push(`/invoices/${inv.id}`)}>
            <Eye className="h-4 w-4" /> View
          </DropdownMenuItem>
          {balance > 0.001 && eff !== "cancelled" && (
            <DropdownMenuItem
              onSelect={() =>
                setPayTarget({
                  id: inv.id,
                  number: inv.number,
                  total: Number(inv.total),
                  amount_paid: Number(inv.amount_paid),
                  currency: inv.currency,
                })
              }
            >
              <Wallet className="h-4 w-4" /> Record payment
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => router.push(`/invoices/${inv.id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(`/print/invoice/${inv.id}`, "_blank")}>
            <Printer className="h-4 w-4" /> Print / PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {inv.status === "draft" && (
            <DropdownMenuItem onSelect={() => changeStatus(inv, "sent")}>
              <Send className="h-4 w-4" /> Mark as sent
            </DropdownMenuItem>
          )}
          {inv.status !== "draft" && eff !== "paid" && inv.status !== "cancelled" && (
            <DropdownMenuItem onSelect={() => changeStatus(inv, "draft")}>
              <Undo2 className="h-4 w-4" /> Revert to draft
            </DropdownMenuItem>
          )}
          {inv.status === "cancelled" ? (
            <DropdownMenuItem onSelect={() => changeStatus(inv, "draft")}>
              <Undo2 className="h-4 w-4" /> Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => changeStatus(inv, "cancelled")}>
              <CircleSlash className="h-4 w-4" /> Cancel invoice
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setDeleting(inv)}>
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryTile label="Invoiced" value={formatCurrency(totals.total, currency)} />
        <SummaryTile label="Paid" value={formatCurrency(totals.paid, currency)} tone="success" />
        <SummaryTile label="Outstanding" value={formatCurrency(totals.outstanding, currency)} tone="danger" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search invoices…" className="lg:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-auto min-w-[9.5rem]">
            <option value="">All statuses</option>
            <option value="unpaid">Unpaid</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INVOICE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-9 w-auto min-w-[9rem]">
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Link href="/invoices/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> New invoice
            </Button>
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title={hasFilters ? "No invoices match your filters" : "No invoices yet"}
          description={
            hasFilters
              ? "Try clearing the filters or search term."
              : "Create an invoice to start tracking what you're owed."
          }
          action={{ label: "New invoice", href: "/invoices/new" }}
        />
      ) : (
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((inv) => {
                const balance = invoiceBalance(inv);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{inv.client_name || "—"}</TableCell>
                    <TableCell>{formatDate(inv.issue_date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatDate(inv.due_date)}</span>
                        {balance > 0.001 && <CountdownBadge date={inv.due_date} />}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(inv.total, inv.currency)}</TableCell>
                    <TableCell
                      className={cn(
                        balance > 0.001 && "font-medium text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {formatCurrency(balance, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={effectiveInvoiceStatus(inv)} />
                    </TableCell>
                    <TableCell>{actionsMenu(inv)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrap>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      )}

      <RecordPaymentForm
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        invoice={payTarget}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this invoice?"
        confirmLabel="Delete invoice"
        description={
          <>
            <strong>{deleting?.number}</strong> and its payments will be permanently removed.
            Consider cancelling it instead to keep the history.
          </>
        }
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 text-lg font-semibold",
            tone === "success" && "text-emerald-600 dark:text-emerald-400",
            tone === "danger" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
