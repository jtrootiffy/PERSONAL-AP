"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  Download,
  FileText,
  Printer,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  endOfMonth,
  endOfQuarter,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/currency";
import { invoiceBalance } from "@/lib/business";
import { round2 } from "@/lib/utils";
import type { Expense, Invoice, Payment, Project } from "@/lib/types";

const CATEGORY_COLORS = [
  "#3478f6",
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#64748b",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
];

type Preset = "30d" | "month" | "quarter" | "year" | "all" | "custom";

function iso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function ReportsView({
  payments,
  invoices,
  expenses,
  projects,
  clients,
  currency,
}: {
  payments: Payment[];
  invoices: Invoice[];
  expenses: Expense[];
  projects: Pick<Project, "id" | "title" | "client_id">[];
  clients: { id: string; name: string }[];
  currency: string;
}) {
  const today = React.useMemo(() => new Date(), []);
  const [preset, setPreset] = React.useState<Preset>("year");
  const [from, setFrom] = React.useState(iso(startOfYear(today)));
  const [to, setTo] = React.useState(iso(today));

  function applyPreset(p: Preset) {
    setPreset(p);
    const now = new Date();
    if (p === "30d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      setFrom(iso(start));
      setTo(iso(now));
    } else if (p === "month") {
      setFrom(iso(startOfMonth(now)));
      setTo(iso(endOfMonth(now)));
    } else if (p === "quarter") {
      setFrom(iso(startOfQuarter(now)));
      setTo(iso(endOfQuarter(now)));
    } else if (p === "year") {
      setFrom(iso(startOfYear(now)));
      setTo(iso(now));
    } else if (p === "all") {
      setFrom("2000-01-01");
      setTo(iso(now));
    }
  }

  const inRange = React.useCallback(
    (value: string | null | undefined) => {
      if (!value) return false;
      const d = value.slice(0, 10);
      return (!from || d >= from) && (!to || d <= to);
    },
    [from, to],
  );

  const invoiceMap = React.useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);
  const clientMap = React.useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const projectMap = React.useMemo(() => new Map(projects.map((p) => [p.id, p.title])), [projects]);

  const data = React.useMemo(() => {
    const paymentsIn = payments.filter((p) => inRange(p.paid_on));
    const expensesIn = expenses.filter((e) => inRange(e.expense_date));
    const invoicesIn = invoices.filter((i) => inRange(i.issue_date));

    const income = round2(paymentsIn.reduce((a, p) => a + Number(p.amount), 0));
    const expenseTotal = round2(expensesIn.reduce((a, e) => a + Number(e.amount), 0));
    const invoiced = round2(
      invoicesIn.filter((i) => i.status !== "cancelled").reduce((a, i) => a + Number(i.total), 0),
    );
    const outstanding = round2(
      invoices
        .filter((i) => i.status !== "cancelled" && invoiceBalance(i) > 0.001)
        .reduce((a, i) => a + Math.max(invoiceBalance(i), 0), 0),
    );

    // Monthly series
    const months = new Map<string, { income: number; expenses: number; invoiced: number }>();
    const startMonth = from ? new Date(`${from.slice(0, 7)}-01`) : startOfMonth(today);
    const endMonth = to ? new Date(`${to.slice(0, 7)}-01`) : startOfMonth(today);
    let cursor = new Date(startMonth);
    let guard = 0;
    while (cursor <= endMonth && guard < 48) {
      months.set(format(cursor, "yyyy-MM"), { income: 0, expenses: 0, invoiced: 0 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      guard++;
    }
    const ensure = (key: string) => {
      if (!months.has(key)) months.set(key, { income: 0, expenses: 0, invoiced: 0 });
      return months.get(key)!;
    };
    for (const p of paymentsIn) ensure(p.paid_on.slice(0, 7)).income += Number(p.amount);
    for (const e of expensesIn) ensure(e.expense_date.slice(0, 7)).expenses += Number(e.amount);
    for (const i of invoicesIn) {
      if (i.status !== "cancelled") ensure((i.issue_date ?? "").slice(0, 7)).invoiced += Number(i.total);
    }
    const series = Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        label: format(new Date(`${key}-01`), "MMM yy"),
        income: round2(v.income),
        expenses: round2(v.expenses),
        invoiced: round2(v.invoiced),
      }));

    // Income by client / project (via invoice)
    const byClient = new Map<string, number>();
    const byProject = new Map<string, number>();
    for (const p of paymentsIn) {
      const inv = invoiceMap.get(p.invoice_id);
      if (!inv) continue;
      const clientName = inv.client_id ? clientMap.get(inv.client_id) ?? "Unknown client" : "No client";
      byClient.set(clientName, round2((byClient.get(clientName) ?? 0) + Number(p.amount)));
      const projectName = inv.project_id ? projectMap.get(inv.project_id) ?? "Unknown project" : "No project";
      byProject.set(projectName, round2((byProject.get(projectName) ?? 0) + Number(p.amount)));
    }
    const clientRows = Array.from(byClient.entries()).sort((a, b) => b[1] - a[1]);
    const projectRows = Array.from(byProject.entries()).sort((a, b) => b[1] - a[1]);

    // Outstanding by client
    const outstandingByClient = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status === "cancelled") continue;
      const bal = Math.max(invoiceBalance(inv), 0);
      if (bal <= 0.001) continue;
      const name = inv.client_id ? clientMap.get(inv.client_id) ?? "Unknown client" : "No client";
      outstandingByClient.set(name, round2((outstandingByClient.get(name) ?? 0) + bal));
    }
    const outstandingRows = Array.from(outstandingByClient.entries()).sort((a, b) => b[1] - a[1]);

    // Expenses by category
    const byCategory = new Map<string, number>();
    for (const e of expensesIn) {
      const name = e.category || "Uncategorised";
      byCategory.set(name, round2((byCategory.get(name) ?? 0) + Number(e.amount)));
    }
    const categoryRows = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

    return {
      income,
      expenseTotal,
      invoiced,
      outstanding,
      net: round2(income - expenseTotal),
      series,
      clientRows,
      projectRows,
      outstandingRows,
      categoryRows,
      counts: { payments: paymentsIn.length, expenses: expensesIn.length, invoices: invoicesIn.length },
    };
  }, [payments, expenses, invoices, from, to, inRange, invoiceMap, clientMap, projectMap, today]);

  const exportUrl = (type: string) => `/api/export?type=${type}&from=${from}&to=${to}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Range</label>
            <Select
              value={preset}
              onChange={(e) => applyPreset(e.target.value as Preset)}
              className="h-9 w-auto min-w-[9.5rem]"
            >
              <option value="30d">Last 30 days</option>
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="h-9 w-auto"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="h-9 w-auto"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href={exportUrl("payments")}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" /> Payments CSV
            </Button>
          </a>
          <a href={exportUrl("invoices")}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" /> Invoices CSV
            </Button>
          </a>
          <a href={exportUrl("expenses")}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" /> Expenses CSV
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Tile icon={<Banknote className="h-4 w-4" />} label="Income received" value={formatCurrency(data.income, currency)} tone="success" />
        <Tile icon={<FileText className="h-4 w-4" />} label="Invoiced" value={formatCurrency(data.invoiced, currency)} />
        <Tile icon={<Wallet className="h-4 w-4" />} label="Outstanding" value={formatCurrency(data.outstanding, currency)} tone="danger" />
        <Tile icon={<Receipt className="h-4 w-4" />} label="Expenses" value={formatCurrency(data.expenseTotal, currency)} tone="warning" />
        <Tile
          icon={data.net >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          label="Net profit"
          value={formatCurrency(data.net, currency)}
          tone={data.net >= 0 ? "success" : "danger"}
        />
      </div>

      <Card className="print-area">
        <CardHeader>
          <CardTitle>Income, expenses & invoiced</CardTitle>
        </CardHeader>
        <CardContent>
          {data.series.length === 0 ? (
            <EmptyState title="No data in this range" description="Try widening the date range." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={64}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => formatCurrency(v, currency, { compact: true })}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                    fontSize: 12,
                    boxShadow: "0 12px 32px -12px rgb(16 24 40 / 0.25)",
                    padding: "8px 12px",
                  }}
                  formatter={(value: number, name) => [formatCurrency(value, currency), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#3478f6" radius={[6, 6, 0, 0]} barSize={16} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={16} />
                <Line type="monotone" dataKey="invoiced" name="Invoiced" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income by client</CardTitle>
          </CardHeader>
          <CardContent>
            {data.clientRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payments in this range.</p>
            ) : (
              <ul className="divide-y">
                {data.clientRows.map(([name, amount]) => (
                  <li key={name} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate">{name}</span>
                    <span className="font-medium">{formatCurrency(amount, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income by project</CardTitle>
          </CardHeader>
          <CardContent>
            {data.projectRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payments in this range.</p>
            ) : (
              <ul className="divide-y">
                {data.projectRows.map(([name, amount]) => (
                  <li key={name} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate">{name}</span>
                    <span className="font-medium">{formatCurrency(amount, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding by client</CardTitle>
          </CardHeader>
          <CardContent>
            {data.outstandingRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing outstanding. 🎉</p>
            ) : (
              <ul className="divide-y">
                {data.outstandingRows.map(([name, amount]) => (
                  <li key={name} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate">{name}</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No expenses in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.categoryRows.map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.categoryRows.map(([name], i) => (
                      <Cell key={name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                      fontSize: 12,
                      boxShadow: "0 12px 32px -12px rgb(16 24 40 / 0.25)",
                      padding: "8px 12px",
                    }}
                    formatter={(value: number) => formatCurrency(value, currency)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Based on {data.counts.payments} payments, {data.counts.invoices} invoices and{" "}
        {data.counts.expenses} expenses in the selected range. Income counts recorded payments only.
      </p>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClass = {
    default: "",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-rose-600 dark:text-rose-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
