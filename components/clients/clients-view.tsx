"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  LayoutGrid,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Rows3,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Avatar } from "@/components/ui/avatar";
import { SearchInput } from "@/components/common/search-input";
import { ClientStatusBadge } from "@/components/common/badges";
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
import { ClientForm } from "@/components/clients/client-form";
import { deleteClientRecord, setClientArchived } from "@/lib/actions/clients";
import { formatCurrency } from "@/lib/currency";
import type { Client } from "@/lib/types";

export type ClientRow = Client & {
  project_count: number;
  invoice_count: number;
  outstanding: number;
};

const PAGE_SIZE = 9;

export function ClientsView({
  clients,
  currency,
  initialStatus,
}: {
  clients: ClientRow[];
  currency: string;
  initialStatus?: string;
}) {
  const toast = useToast();
  const [view, setView] = React.useState<"grid" | "table">("grid");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(initialStatus ?? "");
  const [sort, setSort] = React.useState("name");
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [deleting, setDeleting] = React.useState<ClientRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = clients.slice();
    if (status) rows = rows.filter((c) => c.status === status);
    if (q) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.contact_person ?? "").toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => {
      if (sort === "outstanding") return b.outstanding - a.outstanding;
      if (sort === "created") return b.created_at.localeCompare(a.created_at);
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [clients, query, status, sort]);

  React.useEffect(() => setPage(1), [query, status, sort]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setFormOpen(true);
  }

  async function onArchive(c: ClientRow) {
    const res = await setClientArchived(c.id, c.status === "active");
    if (res.ok) toast.success(c.status === "active" ? "Client archived" : "Client restored");
    else toast.error("Could not update client", res.error);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteClientRecord(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Client deleted", "Invoices and payments were kept.");
      setDeleting(null);
    } else {
      toast.error("Could not delete client", res.error);
    }
  }

  const hasFilters = Boolean(query || status);

  const actionsMenu = (c: ClientRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Client actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => openEdit(c)}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onArchive(c)}>
          {c.status === "active" ? (
            <>
              <Archive className="h-4 w-4" /> Archive
            </>
          ) : (
            <>
              <ArchiveRestore className="h-4 w-4" /> Restore
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => setDeleting(c)}>
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search clients…" className="sm:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-auto min-w-[8.5rem]">
            <option value="">All clients</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 w-auto min-w-[9rem]">
            <option value="name">Sort: Name</option>
            <option value="outstanding">Sort: Outstanding</option>
            <option value="created">Sort: Newest</option>
          </Select>
          <div className="flex items-center rounded-lg border">
            <button
              onClick={() => setView("grid")}
              className={`p-2 ${view === "grid" ? "text-primary" : "text-muted-foreground"}`}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-2 ${view === "table" ? "text-primary" : "text-muted-foreground"}`}
              aria-label="Table view"
            >
              <Rows3 className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New client
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={hasFilters ? "No clients match your filters" : "No clients yet"}
          description={
            hasFilters
              ? "Try clearing the filters or search term."
              : "Add your first client to link projects and invoices to them."
          }
          action={{ label: "New client", onClick: openNew }}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((c) => (
            <Card key={c.id} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={c.name} size={38} />
                    <div className="min-w-0">
                      <Link href={`/clients/${c.id}`} className="block truncate font-medium hover:underline">
                        {c.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.company || c.contact_person || "—"}
                      </p>
                    </div>
                  </div>
                  {actionsMenu(c)}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ClientStatusBadge status={c.status} />
                  <span className="text-[11px] text-muted-foreground">
                    {c.project_count} project{c.project_count === 1 ? "" : "s"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {c.invoice_count} invoice{c.invoice_count === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {c.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5" /> {c.email}
                    </p>
                  )}
                  {c.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                  <span>Outstanding</span>
                  <span className={c.outstanding > 0 ? "font-medium text-rose-600 dark:text-rose-400" : "font-medium text-foreground"}>
                    {formatCurrency(c.outstanding, currency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clients/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                    {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{c.email || "—"}</span>
                      {c.phone && <span className="text-xs">{c.phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ClientStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>{c.project_count}</TableCell>
                  <TableCell>{c.invoice_count}</TableCell>
                  <TableCell>{formatCurrency(c.outstanding, currency)}</TableCell>
                  <TableCell>{actionsMenu(c)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      )}

      <ClientForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this client?"
        confirmLabel="Delete client"
        description={
          <>
            <strong>{deleting?.name}</strong> will be removed. Their invoices and payments are kept for
            your records (they will simply no longer be linked to a client).
          </>
        }
      />
    </div>
  );
}
