"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/common/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ExpenseForm } from "@/components/expenses/expense-form";
import { deleteExpense } from "@/lib/actions/expenses";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { round2 } from "@/lib/utils";
import type { Expense } from "@/lib/types";

export type ExpenseRow = Expense & { project_title: string | null };

const PAGE_SIZE = 12;

export function ExpensesView({
  expenses,
  projects,
  currency,
}: {
  expenses: ExpenseRow[];
  projects: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [range, setRange] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [deleting, setDeleting] = React.useState<ExpenseRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const categories = React.useMemo(() => {
    const set = new Set(expenses.map((e) => e.category).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [expenses]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    let rows = expenses.slice();
    if (category) rows = rows.filter((e) => e.category === category);
    if (range !== "all") {
      rows = rows.filter((e) => {
        const d = new Date(e.expense_date);
        if (range === "month")
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        if (range === "quarter") {
          const q0 = Math.floor(now.getMonth() / 3);
          return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q0;
        }
        if (range === "year") return d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    if (q) {
      rows = rows.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.category ?? "").toLowerCase().includes(q) ||
          (e.project_title ?? "").toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at));
    return rows;
  }, [expenses, query, category, range]);

  React.useEffect(() => setPage(1), [query, category, range]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = round2(filtered.reduce((a, e) => a + Number(e.amount), 0));

  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      const key = e.category || "Uncategorised";
      map.set(key, round2((map.get(key) ?? 0) + Number(e.amount)));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filtered]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteExpense(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Expense deleted");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error("Could not delete expense", res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total (filtered)</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(total, currency)}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">By category</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {byCategory.length === 0 ? (
                <span className="text-sm text-muted-foreground">No expenses.</span>
              ) : (
                byCategory.map(([name, amount]) => (
                  <Badge key={name} tone="muted">
                    {name}
                    <span className="font-semibold">{formatCurrency(amount, currency)}</span>
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search expenses…" className="lg:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onChange={(e) => setRange(e.target.value)} className="h-9 w-auto min-w-[8rem]">
            <option value="all">All time</option>
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
            <option value="year">This year</option>
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-auto min-w-[9rem]">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New expense
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-5 w-5" />}
          title={query || category || range !== "all" ? "No expenses match your filters" : "No expenses yet"}
          description={
            query || category || range !== "all"
              ? "Try clearing the filters or search term."
              : "Track business costs to see your real profit."
          }
          action={{ label: "New expense", onClick: openNew }}
        />
      ) : (
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.category || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.project_id ? (
                      <Link href={`/projects/${e.project_id}`} className="hover:underline">
                        {e.project_title || "Project"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{formatDate(e.expense_date)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(e.amount, currency)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Expense actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={() => setDeleting(e)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      <ExpenseForm open={formOpen} onClose={() => setFormOpen(false)} projects={projects} initial={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this expense?"
        confirmLabel="Delete expense"
        description={`"${deleting?.name}" will be permanently removed.`}
      />
    </div>
  );
}
