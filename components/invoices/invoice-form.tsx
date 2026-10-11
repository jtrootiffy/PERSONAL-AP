"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { computeInvoiceTotals } from "@/lib/business";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { CURRENCIES } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import type { Invoice, InvoiceItem } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

const emptyRow = { description: "", quantity: 1, unit_price: 0 };

export function InvoiceForm({
  open,
  onClose,
  clients,
  projects,
  initial,
  initialItems,
  defaultClientId,
  defaultProjectId,
  currency,
  defaultTaxRate = 0,
  paymentTermsDays = 14,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  clients: Option[];
  projects: Option[];
  initial?: Invoice | null;
  initialItems?: InvoiceItem[];
  defaultClientId?: string;
  defaultProjectId?: string;
  currency: string;
  defaultTaxRate?: number;
  paymentTermsDays?: number;
  onSaved?: (id: string) => void;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      number: "",
      client_id: "",
      project_id: "",
      issue_date: "",
      due_date: "",
      currency,
      discount_type: "none",
      discount_value: 0,
      tax_rate: defaultTaxRate,
      status: "draft",
      notes: "",
      terms: "",
      items: [emptyRow],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  function dueFor(date: string, days: number) {
    const d = date ? new Date(date) : new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      reset({
        number: initial.number ?? "",
        client_id: initial.client_id ?? "",
        project_id: initial.project_id ?? "",
        issue_date: initial.issue_date ? initial.issue_date.slice(0, 10) : "",
        due_date: initial.due_date ? initial.due_date.slice(0, 10) : "",
        currency: initial.currency ?? currency,
        discount_type: initial.discount_type ?? "none",
        discount_value: Number(initial.discount_value ?? 0),
        tax_rate: Number(initial.tax_rate ?? 0),
        status: (initial.status as InvoiceInput["status"]) ?? "draft",
        notes: initial.notes ?? "",
        terms: initial.terms ?? "",
        items:
          initialItems && initialItems.length > 0
            ? initialItems.map((it) => ({
                description: it.description,
                quantity: Number(it.quantity),
                unit_price: Number(it.unit_price),
              }))
            : [emptyRow],
      });
    } else {
      const issue = todayISO();
      reset({
        number: "",
        client_id: defaultClientId ?? "",
        project_id: defaultProjectId ?? "",
        issue_date: issue,
        due_date: dueFor(issue, paymentTermsDays),
        currency,
        discount_type: "none",
        discount_value: 0,
        tax_rate: defaultTaxRate,
        status: "draft",
        notes: "",
        terms: "",
        items: [emptyRow],
      });
    }
  }, [open, initial, initialItems, defaultClientId, defaultProjectId, currency, defaultTaxRate, paymentTermsDays, reset]);

  const watched = watch();
  const totals = computeInvoiceTotals({
    items: (watched.items ?? []).map((it) => ({
      quantity: Number(it?.quantity ?? 0),
      unit_price: Number(it?.unit_price ?? 0),
      amount: Number(it?.quantity ?? 0) * Number(it?.unit_price ?? 0),
    })),
    discountType: watched.discount_type ?? "none",
    discountValue: Number(watched.discount_value ?? 0),
    taxRate: Number(watched.tax_rate ?? 0),
  });

  const itemErrors = errors.items as
    | { message?: string; [k: number]: { description?: { message?: string } } }
    | undefined;

  async function onSubmit(values: InvoiceInput) {
    setPending(true);
    const payload = {
      ...values,
      number: values.number?.trim() || null,
      issue_date: values.issue_date || null,
      due_date: values.due_date || null,
    };
    const res = initial
      ? await updateInvoice(initial.id, payload)
      : await createInvoice(payload);
    setPending(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) setError(key as keyof InvoiceInput, { message: msgs[0] });
        }
      }
      toast.error("Could not save invoice", res.error);
      return;
    }
    toast.success(initial ? "Invoice updated" : "Invoice created");
    if (!initial && res.data?.id) onSaved?.(res.data.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <ModalHeader>
        <ModalTitle>{initial ? `Edit invoice ${initial.number}` : "New invoice"}</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Invoice number" htmlFor="number" error={errors.number?.message} description="Leave blank to auto-generate">
              <Input id="number" placeholder="INV-0001" {...register("number")} />
            </Field>
            <Field label="Client" htmlFor="client_id" error={errors.client_id?.message}>
              <Select id="client_id" {...register("client_id")}>
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project" htmlFor="project_id" error={errors.project_id?.message}>
              <Select id="project_id" {...register("project_id")}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Issue date" htmlFor="issue_date" error={errors.issue_date?.message}>
              <Input
                id="issue_date"
                type="date"
                {...register("issue_date", {
                  onChange: (e) => {
                    const issue = e.target.value;
                    if (!initial && issue) setValue("due_date", dueFor(issue, paymentTermsDays));
                  },
                })}
              />
            </Field>
            <Field label="Due date" htmlFor="due_date" error={errors.due_date?.message}>
              <Input id="due_date" type="date" {...register("due_date")} />
            </Field>
            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <Select id="status" {...register("status")}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Line items</p>
              {itemErrors?.message && (
                <p className="text-xs font-medium text-destructive">{itemErrors.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_5rem_7rem_7rem_2rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit price</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {fields.map((field, index) => {
                const qty = Number(watched.items?.[index]?.quantity ?? 0);
                const price = Number(watched.items?.[index]?.unit_price ?? 0);
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_7rem_7rem_2rem] sm:items-center"
                  >
                    <Input
                      className="col-span-2 sm:col-span-1"
                      placeholder="Description of work"
                      {...register(`items.${index}.description` as const)}
                    />
                    <Input type="number" step="0.01" min="0" placeholder="1" {...register(`items.${index}.quantity` as const)} />
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...register(`items.${index}.unit_price` as const)} />
                    <span className="hidden text-right text-sm sm:block">
                      {formatCurrency(qty * price, watched.currency || currency)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="justify-self-end text-muted-foreground hover:text-destructive"
                      onClick={() => (fields.length > 1 ? remove(index) : undefined)}
                      disabled={fields.length <= 1}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ ...emptyRow })}
            >
              <Plus className="h-4 w-4" /> Add line
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Discount type" htmlFor="discount_type" error={errors.discount_type?.message}>
                  <Select id="discount_type" {...register("discount_type")}>
                    <option value="none">None</option>
                    <option value="fixed">Fixed amount</option>
                    <option value="percent">Percentage</option>
                  </Select>
                </Field>
                <Field label="Discount value" htmlFor="discount_value" error={errors.discount_value?.message}>
                  <Input id="discount_value" type="number" step="0.01" min="0" {...register("discount_value")} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tax rate %" htmlFor="tax_rate" error={errors.tax_rate?.message}>
                  <Input id="tax_rate" type="number" step="0.01" min="0" {...register("tax_rate")} />
                </Field>
                <Field label="Currency" htmlFor="currency" error={errors.currency?.message}>
                  <Select id="currency" {...register("currency")}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <Line label="Subtotal" value={formatCurrency(totals.subtotal, watched.currency || currency)} />
              <Line label="Discount" value={`- ${formatCurrency(totals.discountAmount, watched.currency || currency)}`} />
              <Line label="Tax" value={formatCurrency(totals.taxAmount, watched.currency || currency)} />
              <div className="mt-2 flex items-center justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totals.total, watched.currency || currency)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
              <Textarea id="notes" rows={2} placeholder="Thank you for your business." {...register("notes")} />
            </Field>
            <Field label="Terms" htmlFor="terms" error={errors.terms?.message}>
              <Textarea id="terms" rows={2} placeholder="Payment due within 14 days." {...register("terms")} />
            </Field>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Create invoice"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
