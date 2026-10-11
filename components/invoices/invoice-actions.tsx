"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleSlash, Pencil, Printer, Send, Trash2, Undo2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  RecordPaymentForm,
  type PayableInvoice,
} from "@/components/invoices/record-payment-form";
import { useToast } from "@/components/ui/toast";
import { deleteInvoice, setInvoiceStatus } from "@/lib/actions/invoices";
import { invoiceBalance } from "@/lib/business";
import type { Invoice, StoredInvoiceStatus } from "@/lib/types";

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const toast = useToast();
  const [payOpen, setPayOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const balance = invoiceBalance(invoice);
  const payable: PayableInvoice = {
    id: invoice.id,
    number: invoice.number,
    total: Number(invoice.total),
    amount_paid: Number(invoice.amount_paid),
    currency: invoice.currency,
  };

  async function changeStatus(next: StoredInvoiceStatus, label: string) {
    const res = await setInvoiceStatus(invoice.id, next);
    if (res.ok) {
      toast.success(`Invoice ${label}`);
      router.refresh();
    } else {
      toast.error("Could not update invoice", res.error);
    }
  }

  async function doDelete() {
    setBusy(true);
    const res = await deleteInvoice(invoice.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Invoice deleted");
      router.push("/invoices");
    } else {
      toast.error("Could not delete invoice", res.error);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {balance > 0.001 && invoice.status !== "cancelled" && (
          <Button size="sm" onClick={() => setPayOpen(true)}>
            <Wallet className="h-4 w-4" /> Record payment
          </Button>
        )}
        <Link href={`/invoices/${invoice.id}/edit`}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(`/print/invoice/${invoice.id}`, "_blank")}
        >
          <Printer className="h-4 w-4" /> Print / PDF
        </Button>

        {invoice.status === "draft" && (
          <Button size="sm" variant="outline" onClick={() => changeStatus("sent", "marked as sent")}>
            <Send className="h-4 w-4" /> Mark as sent
          </Button>
        )}
        {invoice.status !== "draft" && invoice.status !== "cancelled" && (
          <Button size="sm" variant="ghost" onClick={() => changeStatus("draft", "reverted to draft")}>
            <Undo2 className="h-4 w-4" /> Revert to draft
          </Button>
        )}
        {invoice.status === "cancelled" ? (
          <Button size="sm" variant="ghost" onClick={() => changeStatus("draft", "restored")}>
            <Undo2 className="h-4 w-4" /> Restore
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => changeStatus("cancelled", "cancelled")}
          >
            <CircleSlash className="h-4 w-4" /> Cancel
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <RecordPaymentForm
        open={payOpen}
        onClose={() => setPayOpen(false)}
        invoice={payable}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete this invoice?"
        confirmLabel="Delete invoice"
        description="The invoice and all of its recorded payments will be permanently removed."
      />
    </>
  );
}
