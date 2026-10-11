"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { deletePayment } from "@/lib/actions/payments";
import { formatCurrency } from "@/lib/currency";

export function DeletePaymentButton({
  paymentId,
  amount,
  currency,
  label,
}: {
  paymentId: string;
  amount: number;
  currency: string;
  label?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function doDelete() {
    setBusy(true);
    const res = await deletePayment(paymentId);
    setBusy(false);
    if (res.ok) {
      toast.success("Payment removed");
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Could not remove payment", res.error);
    }
  }

  return (
    <>
      {label ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" /> {label}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete payment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={doDelete}
        loading={busy}
        title="Remove this payment?"
        confirmLabel="Remove payment"
        description={`The ${formatCurrency(amount, currency)} payment will be deleted and the invoice balance updated.`}
      />
    </>
  );
}
