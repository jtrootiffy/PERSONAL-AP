"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { clientSchema, type ClientInput } from "@/lib/validation";
import {
  createClientRecord,
  updateClientRecord,
  findDuplicateClients,
} from "@/lib/actions/clients";
import type { DuplicateClient } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { Client } from "@/lib/types";

export function ClientForm({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Client | null;
  onSaved?: (id: string) => void;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const [duplicates, setDuplicates] = React.useState<DuplicateClient[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      billing_address: "",
      contact_person: "",
      notes: "",
      status: "active",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name ?? "",
      company: initial?.company ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      billing_address: initial?.billing_address ?? "",
      contact_person: initial?.contact_person ?? "",
      notes: initial?.notes ?? "",
      status: initial?.status ?? "active",
    });
    setDuplicates([]);
  }, [open, initial, reset]);

  const name = watch("name");
  const email = watch("email");

  // Warn (but never block) on a similar name or email.
  React.useEffect(() => {
    if (!open || initial) return;
    const term = (name ?? "").trim();
    const mail = (email ?? "").trim();
    if (term.length < 2 && mail.length < 3) {
      setDuplicates([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const found = await findDuplicateClients(term, mail);
        setDuplicates(found);
      } catch {
        /* ignore */
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [open, initial, name, email]);

  async function onSubmit(values: ClientInput) {
    setPending(true);
    const res = initial
      ? await updateClientRecord(initial.id, values)
      : await createClientRecord(values, { force: duplicates.length > 0 });
    setPending(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) setError(key as keyof ClientInput, { message: msgs[0] });
        }
      }
      toast.error("Could not save client", res.error);
      return;
    }

    toast.success(initial ? "Client updated" : "Client added");
    if (!initial && res.data?.id) onSaved?.(res.data.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>{initial ? "Edit client" : "New client"}</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client name" htmlFor="name" error={errors.name?.message} required>
              <Input id="name" placeholder="e.g. Acme Corp" {...register("name")} />
            </Field>
            <Field label="Company" htmlFor="company" error={errors.company?.message}>
              <Input id="company" placeholder="Legal or trading name" {...register("company")} />
            </Field>
          </div>

          {duplicates.length > 0 && (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">A similar client already exists.</p>
                <ul className="mt-1 space-y-0.5">
                  {duplicates.map((d) => (
                    <li key={d.id}>
                      <Link href={`/clients/${d.id}`} className="font-medium underline">
                        {d.name}
                      </Link>
                      {d.email ? ` · ${d.email}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-1">You can still save this one — it looks like a different contact.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" placeholder="name@company.com" {...register("email")} />
            </Field>
            <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" placeholder="+63 900 000 0000" {...register("phone")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact person" htmlFor="contact_person" error={errors.contact_person?.message}>
              <Input id="contact_person" placeholder="Primary contact" {...register("contact_person")} />
            </Field>
            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <Select id="status" {...register("status")}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
          </div>

          <Field label="Billing address" htmlFor="billing_address" error={errors.billing_address?.message}>
            <Textarea id="billing_address" rows={2} {...register("billing_address")} />
          </Field>

          <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" rows={2} placeholder="Anything worth remembering…" {...register("notes")} />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Create client"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
