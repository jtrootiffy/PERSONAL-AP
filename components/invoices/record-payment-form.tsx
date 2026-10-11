"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { paymentSchema, type PaymentInput } from "@/lib/validation";
import { recordPayment } from "@/lib/actions/payments";
import { formatCurrency } from "@/lib/currency";
import { todayISO } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_METHODS } from "@/lib/constants";
import { round2 } from "@/lib/utils";

export interface PayableInvoice {
  id: string;
  number: string;
  total: number;
  amount_paid: number;
  currency: string;
}

export function RecordPaymentForm({
  open,
  onClose,
  invoice,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  invoice: PayableInvoice | null;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const remaining = invoice ? round2(Number(invoice.total) - Number(invoice.amount_paid)) : 0;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoice_id: "",
      amount: 0,
      paid_on: "",
      method: "",
      reference: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (!open || !invoice) return;
    reset({
      invoice_id: invoice.id,
      amount: remaining > 0 ? remaining : 0,
      paid_on: todayISO(),
      method: "",
      reference: "",
      notes: "",
    });
  }, [open, invoice, remaining, reset]);

  async function onSubmit(values: PaymentInput) {
    if (!invoice) return;
    setPending(true);
    const res = await recordPayment({
      ...values,
      paid_on: values.paid_on || null,
    });
    setPending(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) setError(key as keyof PaymentInput, { message: msgs[0] });
        }
      }
      toast.error("Could not record payment", res.error);
      return;
    }
    toast.success("Payment recorded");
    onSaved?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <ModalHeader>
        <ModalTitle>Record payment</ModalTitle>
      </ModalHeader>
      {invoice && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-medium">{invoice.number}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Outstanding balance</span>
              <span className="font-semibold">{formatCurrency(remaining, invoice.currency)}</span>
            </div>

            <Field label="Amount" htmlFor="amount" error={errors.amount?.message} required>
              <Input id="amount" type="number" step="0.01" min="0" {...register("amount")} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Paid on" htmlFor="paid_on" error={errors.paid_on?.message}>
                <Input id="paid_on" type="date" {...register("paid_on")} />
              </Field>
              <Field label="Method" htmlFor="method" error={errors.method?.message}>
                <Select id="method" {...register("method")}>
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Reference" htmlFor="reference" error={errors.reference?.message}>
              <Input id="reference" placeholder="Transaction / reference no." {...register("reference")} />
            </Field>

            <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </Field>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || remaining <= 0}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Record payment
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
