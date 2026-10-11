"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pin } from "lucide-react";
import { noteSchema, type NoteInput } from "@/lib/validation";
import { createNote, updateNote } from "@/lib/actions/notes";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

export function NoteForm({
  open,
  onClose,
  projects,
  clients,
  tasks,
  initial,
  defaultProjectId,
  defaultClientId,
}: {
  open: boolean;
  onClose: () => void;
  projects: Option[];
  clients: Option[];
  tasks: Option[];
  initial?: Note | null;
  defaultProjectId?: string;
  defaultClientId?: string;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
      project_id: "",
      task_id: "",
      client_id: "",
      pinned: false,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      project_id: initial?.project_id ?? defaultProjectId ?? "",
      task_id: initial?.task_id ?? "",
      client_id: initial?.client_id ?? defaultClientId ?? "",
      pinned: initial?.pinned ?? false,
    });
  }, [open, initial, defaultProjectId, defaultClientId, reset]);

  const pinned = watch("pinned");

  async function onSubmit(values: NoteInput) {
    setPending(true);
    const res = initial
      ? await updateNote(initial.id, values)
      : await createNote(values);
    setPending(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) setError(key as keyof NoteInput, { message: msgs[0] });
        }
      }
      toast.error("Could not save note", res.error);
      return;
    }
    toast.success(initial ? "Note updated" : "Note added");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <ModalHeader>
        <ModalTitle>{initial ? "Edit note" : "New note"}</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input id="title" placeholder="Note title" {...register("title")} />
          </Field>
          <Field label="Content" htmlFor="content" error={errors.content?.message}>
            <Textarea id="content" rows={6} placeholder="Write anything…" {...register("content")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <Field label="Task" htmlFor="task_id" error={errors.task_id?.message}>
              <Select id="task_id" {...register("task_id")}>
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <button
            type="button"
            onClick={() => setValue("pinned", !pinned)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              pinned ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Pin className={cn("h-4 w-4", pinned && "fill-current")} />
            {pinned ? "Pinned" : "Pin this note"}
          </button>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Add note"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
