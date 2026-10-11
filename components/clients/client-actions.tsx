"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClientForm } from "@/components/clients/client-form";
import { useToast } from "@/components/ui/toast";
import { deleteClientRecord, setClientArchived } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";

export function ClientActions({ client }: { client: Client }) {
  const router = useRouter();
  const toast = useToast();
  const [formOpen, setFormOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function toggleArchive() {
    const archived = client.status === "active";
    const res = await setClientArchived(client.id, archived);
    if (res.ok) {
      toast.success(archived ? "Client archived" : "Client restored");
      router.refresh();
    } else {
      toast.error("Could not update client", res.error);
    }
  }

  async function doDelete() {
    setBusy(true);
    const res = await deleteClientRecord(client.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Client deleted");
      router.push("/clients");
    } else {
      toast.error("Could not delete client", res.error);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={toggleArchive}>
          {client.status === "active" ? (
            <>
              <Archive className="h-4 w-4" /> Archive
            </>
          ) : (
            <>
              <ArchiveRestore className="h-4 w-4" /> Restore
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <ClientForm open={formOpen} onClose={() => setFormOpen(false)} initial={client} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete this client?"
        confirmLabel="Delete client"
        description="Invoices and payments are kept for your records but will no longer be linked to this client."
      />
    </>
  );
}
