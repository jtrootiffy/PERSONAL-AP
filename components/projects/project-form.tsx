"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { projectSchema, type ProjectInput } from "@/lib/validation";
import { createProject, updateProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PRIORITIES, PROJECT_STATUSES, PRIORITY_LABELS, PROJECT_STATUS_LABELS } from "@/lib/constants";
import type { Project } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

export function ProjectForm({
  open,
  onClose,
  clients,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  clients: Option[];
  initial?: Project | null;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      client_id: "",
      category: "",
      start_date: "",
      deadline: "",
      status: "planning",
      priority: "medium",
      budget: 0,
      progress: 0,
      progress_mode: "auto",
      archived: false,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      client_id: initial?.client_id ?? "",
      category: initial?.category ?? "",
      start_date: initial?.start_date ?? "",
      deadline: initial?.deadline ?? "",
      status: initial?.status ?? "planning",
      priority: initial?.priority ?? "medium",
      budget: Number(initial?.budget ?? 0),
      progress: initial?.progress ?? 0,
      progress_mode: initial?.progress_mode ?? "auto",
      archived: initial?.archived ?? false,
      notes: initial?.notes ?? "",
    });
  }, [open, initial, reset]);

  const progressMode = watch("progress_mode");

  async function onSubmit(values: ProjectInput) {
    setPending(true);
    const res = initial
      ? await updateProject(initial.id, values)
      : await createProject(values);
    setPending(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) setError(key as keyof ProjectInput, { message: msgs[0] });
        }
      }
      toast.error("Could not save project", res.error);
      return;
    }
    toast.success(initial ? "Project updated" : "Project created");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>{initial ? "Edit project" : "New project"}</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <Field label="Project title" htmlFor="title" error={errors.title?.message} required>
            <Input id="title" placeholder="e.g. Website redesign" {...register("title")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Field label="Category / type" htmlFor="category" error={errors.category?.message}>
              <Input id="category" placeholder="Web, Design, Consulting…" {...register("category")} />
            </Field>
          </div>

          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={3} placeholder="What is this project about?" {...register("description")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="start_date" error={errors.start_date?.message}>
              <Input id="start_date" type="date" {...register("start_date")} />
            </Field>
            <Field label="Deadline" htmlFor="deadline" error={errors.deadline?.message}>
              <Input id="deadline" type="date" {...register("deadline")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <Select id="status" {...register("status")}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="priority" error={errors.priority?.message}>
              <Select id="priority" {...register("priority")}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Budget" htmlFor="budget" error={errors.budget?.message}>
              <Input id="budget" type="number" step="0.01" min="0" {...register("budget")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Progress tracking"
              htmlFor="progress_mode"
              error={errors.progress_mode?.message}
              description="Auto derives progress from completed tasks."
            >
              <Select id="progress_mode" {...register("progress_mode")}>
                <option value="auto">Automatic (from tasks)</option>
                <option value="manual">Manual</option>
              </Select>
            </Field>
            <Field label="Progress %" htmlFor="progress" error={errors.progress?.message}>
              <Input
                id="progress"
                type="number"
                min={0}
                max={100}
                disabled={progressMode === "auto"}
                {...register("progress")}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" rows={2} placeholder="Internal notes, links, references…" {...register("notes")} />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Create project"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
