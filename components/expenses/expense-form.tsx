"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { expenseSchema, type ExpenseInput } from "@/lib/validation";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import type { Expense } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

export function ExpenseForm({
  open,
  onClose,
  projects,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  projects: Option[];
  initial?: Expense | null;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: "",
      category: "",
      project_id: "",
      expense_date: "",
      amount: 0,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name ?? "",
      category: initial?.category ?? "",
      project_id: initial?.project_id ?? "",
      expense_date: initial?.expense_date ? initial.expense_date.slice(0, 10) : todayISO(),
      amount: Number(initial?.amount ?? 0),
      notes: initial?.notes ?? "",
    });
  }, [open, initial, reset]);

  async function onSubmit(values: ExpenseInput) {
    setPending(true);
    const res = initial
      ? await updateExpense(initial.id, values)
      : await createExpense(values);
    setPending(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) setError(key as keyof ExpenseInput, { message: msgs[0] });
        }
      }
      toast.error("Could not save expense", res.error);
      return;
    }
    toast.success(initial ? "Expense updated" : "Expense added");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <ModalHeader>
        <ModalTitle>{initial ? "Edit expense" : "New expense"}</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <Field label="Expense name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" placeholder="e.g. Figma subscription" {...register("name")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="category" error={errors.category?.message}>
              <Select id="category" {...register("category")}>
                <option value="">Uncategorised</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount" htmlFor="amount" error={errors.amount?.message} required>
              <Input id="amount" type="number" step="0.01" min="0" {...register("amount")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="expense_date" error={errors.expense_date?.message}>
              <Input id="expense_date" type="date" {...register("expense_date")} />
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

          <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Add expense"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
