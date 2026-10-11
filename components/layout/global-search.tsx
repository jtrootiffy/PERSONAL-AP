"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  FolderKanban,
  CheckSquare,
  StickyNote,
  Users,
  Search,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface SearchHit {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface SearchResults {
  projects: SearchHit[];
  tasks: SearchHit[];
  clients: SearchHit[];
  invoices: SearchHit[];
  notes: SearchHit[];
}

const EMPTY: SearchResults = {
  projects: [],
  tasks: [],
  clients: [],
  invoices: [],
  notes: [],
};

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setResults(EMPTY);
      setActiveIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 1) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          setResults((await res.json()) as SearchResults);
          setActiveIndex(0);
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, open]);

  const flat = React.useMemo(() => {
    const groups: { label: string; icon: React.ReactNode; items: SearchHit[] }[] = [
      { label: "Projects", icon: <FolderKanban className="h-4 w-4" />, items: results.projects },
      { label: "Tasks", icon: <CheckSquare className="h-4 w-4" />, items: results.tasks },
      { label: "Clients", icon: <Users className="h-4 w-4" />, items: results.clients },
      { label: "Invoices", icon: <FileText className="h-4 w-4" />, items: results.invoices },
      { label: "Notes", icon: <StickyNote className="h-4 w-4" />, items: results.notes },
    ];
    return groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label, icon: g.icon })));
  }, [results]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[activeIndex];
      if (target) go(target.href);
    }
  }

  let runningIndex = -1;

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl self-start sm:mt-[10vh]">
      <div className="flex items-center gap-2 border-b px-4">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search projects, tasks, clients, invoices, notes…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {!q.trim() ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Start typing to search across your workspace.
          </p>
        ) : flat.length === 0 && !loading ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No results for "{q}".
          </p>
        ) : (
          ["Projects", "Tasks", "Clients", "Invoices", "Notes"].map((label) => {
            const items = flat.filter((f) => f.group === label);
            if (items.length === 0) return null;
            return (
              <div key={label} className="mb-2">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                {items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  return (
                    <button
                      key={`${label}-${item.id}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => go(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        activeIndex === idx ? "bg-accent" : "hover:bg-accent/60",
                      )}
                    >
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        {item.subtitle && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
