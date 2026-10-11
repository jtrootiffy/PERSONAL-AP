"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  FolderKanban,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/common/search-input";
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
import { CountdownBadge, PriorityBadge, ProjectStatusBadge } from "@/components/common/badges";
import { ProjectForm } from "@/components/projects/project-form";
import { deleteProject, setProjectArchived } from "@/lib/actions/projects";
import { PRIORITIES, PRIORITY_LABELS, PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/currency";
import type { Project } from "@/lib/types";

export type ProjectRow = Project & { client_name: string | null };

interface Option {
  id: string;
  name: string;
}

const PAGE_SIZE = 9;

export function ProjectsView({
  projects,
  clients,
  currency,
  initialNew = false,
  initialStatus,
}: {
  projects: ProjectRow[];
  clients: Option[];
  currency: string;
  initialNew?: boolean;
  initialStatus?: string;
}) {
  const toast = useToast();
  const [view, setView] = React.useState<"grid" | "table">("grid");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(initialStatus ?? "");
  const [priority, setPriority] = React.useState("");
  const [sort, setSort] = React.useState("deadline");
  const [showArchived, setShowArchived] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(initialNew);
  const [editing, setEditing] = React.useState<Project | null>(null);
  const [deleting, setDeleting] = React.useState<ProjectRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = projects.filter((p) => (showArchived ? true : !p.archived));
    if (status) rows = rows.filter((p) => p.status === status);
    if (priority) rows = rows.filter((p) => p.priority === priority);
    if (q) {
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.client_name ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = rows.slice().sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "updated") return b.updated_at.localeCompare(a.updated_at);
      if (sort === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
    return sorted;
  }, [projects, query, status, priority, sort, showArchived]);

  React.useEffect(() => setPage(1), [query, status, priority, sort, showArchived]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: Project) {
    setEditing(p);
    setFormOpen(true);
  }

  async function onArchive(p: ProjectRow) {
    const res = await setProjectArchived(p.id, !p.archived);
    if (res.ok) toast.success(p.archived ? "Project restored" : "Project archived");
    else toast.error("Could not update project", res.error);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteProject(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Project deleted", "Related invoices and payments were preserved.");
      setDeleting(null);
    } else {
      toast.error("Could not delete project", res.error);
    }
  }

  const hasFilters = Boolean(query || status || priority || showArchived);

  const actionsMenu = (p: ProjectRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Project actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => openEdit(p)}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onArchive(p)}>
          {p.archived ? (
            <>
              <ArchiveRestore className="h-4 w-4" /> Restore
            </>
          ) : (
            <>
              <Archive className="h-4 w-4" /> Archive
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => setDeleting(p)}>
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search projects…" className="sm:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-auto min-w-[9rem]">
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 w-auto min-w-[8rem]">
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 w-auto min-w-[9rem]">
            <option value="deadline">Sort: Deadline</option>
            <option value="updated">Sort: Recently updated</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </Select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Archived
          </label>
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
            <Plus className="h-4 w-4" /> New project
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title={hasFilters ? "No projects match your filters" : "No projects yet"}
          description={
            hasFilters
              ? "Try clearing the filters or search term."
              : "Create your first project to start tracking progress, tasks and invoices."
          }
          action={{ label: "New project", onClick: openNew }}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((p) => (
            <Card key={p.id} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/projects/${p.id}`} className="block truncate font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.client_name || "No client"}
                      {p.category ? ` · ${p.category}` : ""}
                    </p>
                  </div>
                  {actionsMenu(p)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ProjectStatusBadge status={p.status} />
                  <PriorityBadge priority={p.priority} />
                  {p.archived && <span className="text-[11px] text-muted-foreground">Archived</span>}
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} tone={p.progress === 100 ? "success" : "primary"} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {p.deadline ? `Due ${formatDate(p.deadline)}` : "No deadline"}
                  </span>
                  <CountdownBadge date={p.deadline} />
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                  <span>Budget</span>
                  <span className="font-medium text-foreground">{formatCurrency(p.budget, currency)}</span>
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
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/projects/${p.id}`} className="hover:underline">
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.client_name || "—"}</TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={p.priority} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{p.deadline ? formatDate(p.deadline) : "—"}</span>
                      <CountdownBadge date={p.deadline} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex w-28 items-center gap-2">
                      <Progress value={p.progress} className="h-1.5" />
                      <span className="text-xs text-muted-foreground">{p.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(p.budget, currency)}</TableCell>
                  <TableCell>{actionsMenu(p)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      )}

      <ProjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        clients={clients}
        initial={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this project?"
        confirmLabel="Delete project"
        description={
          <>
            <strong>{deleting?.title}</strong> will be removed. Its tasks, invoices and payments are
            kept for your records (they will simply no longer be linked to a project).
          </>
        }
      />
    </div>
  );
}
