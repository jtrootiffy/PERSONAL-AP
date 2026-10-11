"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/common/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from "@/components/ui/table";
import { DeletePaymentButton } from "@/components/payments/payment-actions";
import {
  RecordPaymentForm,
  type PayableInvoice,
} from "@/components/invoices/record-payment-form";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { round2 } from "@/lib/utils";
import type { Payment } from "@/lib/types";

export type PaymentRow = Payment & {
  invoice_number: string | null;
  client_name: string | null;
  currency: string;
};

const PAGE_SIZE = 15;

export function PaymentsView({
  payments,
  unpaidInvoices,
  currency,
}: {
  payments: PaymentRow[];
  unpaidInvoices: PayableInvoice[];
  currency: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [payTarget, setPayTarget] = React.useState<PayableInvoice | null>(null);

  const methods = React.useMemo(() => {
    const set = new Set(payments.map((p) => p.method).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [payments]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = payments.filter((p) => (method ? p.method === method : true));
    if (q) {
      rows = rows.filter(
        (p) =>
          (p.invoice_number ?? "").toLowerCase().includes(q) ||
          (p.client_name ?? "").toLowerCase().includes(q) ||
          (p.reference ?? "").toLowerCase().includes(q) ||
          (p.method ?? "").toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.paid_on.localeCompare(a.paid_on) || b.created_at.localeCompare(a.created_at));
    return rows;
  }, [payments, query, method]);

  React.useEffect(() => setPage(1), [query, method]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIncome = round2(filtered.reduce((a, p) => a + Number(p.amount), 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Payments" value={String(filtered.length)} />
        <Summary label="Income received (filtered)" value={formatCurrency(totalIncome, currency)} tone="success" />
        <Summary label="Total income (all time)" value={formatCurrency(round2(payments.reduce((a, p) => a + Number(p.amount), 0)), currency)} tone="success" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search payments…" className="lg:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-9 w-auto min-w-[8.5rem]"
          >
            <option value="">All methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Select
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              const inv = unpaidInvoices.find((i) => i.id === id);
              if (inv) setPayTarget(inv);
              e.target.value = "";
            }}
            className="h-9 w-auto min-w-[13rem]"
            aria-label="Record a payment"
          >
            <option value="">Record payment for…</option>
            {unpaidInvoices.map((i) => (
              <option key={i.id} value={i.id}>
                {i.number} — {formatCurrency(i.total - i.amount_paid, i.currency)} due
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title={query || method ? "No payments match your filters" : "No payments yet"}
          description={
            query || method
              ? "Try clearing the filters or search term."
              : "Record a payment against an invoice to capture your income."
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/invoices/${p.invoice_id}`} className="hover:underline">
                      {p.invoice_number || "Invoice"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.client_name || "—"}</TableCell>
                  <TableCell>{formatDate(p.paid_on)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.method || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.reference || "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.amount, p.currency)}
                  </TableCell>
                  <TableCell>
                    <DeletePaymentButton paymentId={p.id} amount={Number(p.amount)} currency={p.currency} />
                  </TableCell>
                </TableRow>
              ))}
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
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-lg font-semibold ${
            tone === "success" ? "text-emerald-600 dark:text-emerald-400" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}