"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { eventSchema, type EventInput } from "@/lib/validation";
import { createEvent, updateEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { EVENT_TYPES, EVENT_TYPE_LABELS } from "@/lib/constants";
import { toDateTimeLocal } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

function toISO(local: string, allDay: boolean): string {
  if (!local) return local;
  if (allDay && local.length === 10) return new Date(`${local}T00:00`).toISOString();
  const d = new Date(local);
  return isNaN(d.getTime()) ? local : d.toISOString();
}

export function EventForm({
  open,
  onClose,
  clients,
  projects,
  initial,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  clients: Option[];
  projects: Option[];
  initial?: CalendarEvent | null;
  defaultDate?: string;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "meeting",
      start_at: "",
      end_at: "",
      all_day: false,
      client_id: "",
      project_id: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      type: initial?.type ?? "meeting",
      start_at: initial ? toDateTimeLocal(initial.start_at) : defaultDate ? `${defaultDate}T09:00` : "",
      end_at: initial ? toDateTimeLocal(initial.end_at) : "",
      all_day: initial?.all_day ?? false,
      client_id: initial?.client_id ?? "",
      project_id: initial?.project_id ?? "",
    });
  }, [open, initial, defaultDate, reset]);

  const allDay = watch("all_day");

  async function onSubmit(values: EventInput) {
    setPending(true);
    const payload: EventInput = {
      ...values,
      start_at: toISO(values.start_at, values.all_day),
      end_at: values.end_at ? toISO(values.end_at, values.all_day) : null,
    };
    const res = initial ? await updateEvent(initial.id, payload) : await createEvent(payload);
    setPending(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) setError(key as keyof EventInput, { message: msgs[0] });
        }
      }
      toast.error("Could not save event", res.error);
      return;
    }
    toast.success(initial ? "Event updated" : "Event created");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <ModalHeader>
        <ModalTitle>{initial ? "Edit event" : "New event"}</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <Field label="Title" htmlFor="title" error={errors.title?.message} required>
            <Input id="title" placeholder="e.g. Client kickoff call" {...register("title")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="type" error={errors.type?.message}>
              <Select id="type" {...register("type")}>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EVENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setValue("all_day", !allDay)}
                className={cn(
                  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                  allDay ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {allDay ? "All-day event" : "Set as all-day"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="start_at" error={errors.start_at?.message} required>
              <Input
                id="start_at"
                type={allDay ? "date" : "datetime-local"}
                {...register("start_at")}
              />
            </Field>
            <Field label="Ends" htmlFor="end_at" error={errors.end_at?.message}>
              <Input id="end_at" type={allDay ? "date" : "datetime-local"} {...register("end_at")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client" htmlFor="client_id" error={errors.client_id?.message}>
              <Select id="client_id" {...register("client_id")}>
                <option value="">None</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project" htmlFor="project_id" error={errors.project_id?.message}>
              <Select id="project_id" {...register("project_id")}>
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={3} {...register("description")} />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Create event"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
