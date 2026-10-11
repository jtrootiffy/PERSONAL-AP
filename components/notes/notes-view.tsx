"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, MoreHorizontal, Pencil, Pin, PinOff, Plus, StickyNote, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/common/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NoteForm } from "@/components/notes/note-form";
import { deleteNote, toggleNotePin } from "@/lib/actions/notes";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";

export type NoteRow = Note & {
  project_title: string | null;
  client_name: string | null;
  task_title: string | null;
};

export function NotesView({
  notes,
  projects,
  clients,
  tasks,
}: {
  notes: NoteRow[];
  projects: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  tasks: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Note | null>(null);
  const [deleting, setDeleting] = React.useState<NoteRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = notes.slice();
    if (filter === "pinned") rows = rows.filter((n) => n.pinned);
    else if (filter === "projects") rows = rows.filter((n) => n.project_id);
    else if (filter === "clients") rows = rows.filter((n) => n.client_id);
    if (q) {
      rows = rows.filter(
        (n) =>
          n.title.toLowerCase().includes(q) || (n.content ?? "").toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
    return rows;
  }, [notes, query, filter]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  async function togglePin(n: NoteRow) {
    const res = await toggleNotePin(n.id, !n.pinned);
    if (res.ok) router.refresh();
    else toast.error("Could not update note", res.error);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteNote(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Note deleted");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error("Could not delete note", res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search notes…" className="sm:max-w-xs" />
        <div className="flex items-center gap-2">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-auto min-w-[9rem]">
            <option value="all">All notes</option>
            <option value="pinned">Pinned</option>
            <option value="projects">Linked to projects</option>
            <option value="clients">Linked to clients</option>
          </Select>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New note
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-5 w-5" />}
          title={query || filter !== "all" ? "No notes match your filters" : "No notes yet"}
          description={
            query || filter !== "all"
              ? "Try clearing the filters or search term."
              : "Capture ideas, meeting notes and reminders."
          }
          action={{ label: "New note", onClick: openNew }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "flex flex-col transition-shadow hover:shadow-md",
                n.pinned && "ring-1 ring-primary/40",
              )}
            >
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 break-words text-sm font-semibold">
                    {n.title || "Untitled note"}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => togglePin(n)}
                      className={cn(
                        "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent",
                        n.pinned && "text-primary",
                      )}
                      aria-label={n.pinned ? "Unpin note" : "Pin note"}
                    >
                      {n.pinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Note actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => { setEditing(n); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={() => setDeleting(n)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {n.content && (
                  <p className="line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">
                    {n.content}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                  {n.project_title && (
                    <Link
                      href={`/projects/${n.project_id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <FolderKanban className="h-3 w-3" /> {n.project_title}
                    </Link>
                  )}
                  {n.client_name && (
                    <Link
                      href={`/clients/${n.client_id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Users className="h-3 w-3" /> {n.client_name}
                    </Link>
                  )}
                  {n.task_title && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {n.task_title}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Updated {formatDateTime(n.updated_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NoteForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projects={projects}
        clients={clients}
        tasks={tasks}
        initial={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this note?"
        confirmLabel="Delete note"
        description={`"${deleting?.title || "Untitled note"}" will be permanently removed.`}
      />
    </div>
  );
}
