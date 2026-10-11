"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { taskSchema, type TaskInput } from "@/lib/validation";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import type { Task } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

export function TaskForm({
  open,
  onClose,
  projects,
  clients,
  initial,
  defaultProjectId,
  defaultDueDate,
}: {
  open: boolean;
  onClose: () => void;
  projects: Option[];
  clients: Option[];
  initial?: Task | null;
  defaultProjectId?: string;
  defaultDueDate?: string;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      project_id: "",
      client_id: "",
      priority: "medium",
      status: "todo",
      start_date: "",
      due_date: "",
      estimated_hours: 0,
      actual_hours: 0,
      recurrence: "none",
      sort_order: 0,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      project_id: initial?.project_id ?? defaultProjectId ?? "",
      client_id: initial?.client_id ?? "",
      priority: initial?.priority ?? "medium",
      status: initial?.status ?? "todo",
      start_date: initial?.start_date ? initial.start_date.slice(0, 10) : "",
      due_date: initial?.due_date ? initial.due_date.slice(0, 16) : defaultDueDate ?? "",
      estimated_hours: Number(initial?.estimated_hours ?? 0),
      actual_hours: Number(initial?.actual_hours ?? 0),
      recurrence: initial?.recurrence ?? "none",
      sort_order: initial?.sort_order ?? 0,
    });
  }, [open, initial, defaultProjectId, defaultDueDate, reset]);

  async function onSubmit(values: TaskInput) {
    setPending(true);
    const payload = {
      ...values,
      due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
      start_date: values.start_date ? values.start_date : null,
    };
    const res = initial ? await updateTask(initial.id, payload) : await createTask(payload);
    setPending(false);

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) setError(key as keyof TaskInput, { message: msgs[0] });
        }
      }
      toast.error("Could not save task", res.error);
      return;
    }
    toast.success(initial ? "Task updated" : "Task created");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>{initial ? "Edit task" : "New task"}</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <Field label="Task title" htmlFor="title" error={errors.title?.message} required>
            <Input id="title" placeholder="e.g. Draft homepage copy" {...register("title")} />
          </Field>

          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={2} {...register("description")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Priority" htmlFor="priority" error={errors.priority?.message}>
              <Select id="priority" {...register("priority")}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <Select id="status" {...register("status")}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="start_date" error={errors.start_date?.message}>
              <Input id="start_date" type="date" {...register("start_date")} />
            </Field>
            <Field label="Due date & time" htmlFor="due_date" error={errors.due_date?.message}>
              <Input id="due_date" type="datetime-local" {...register("due_date")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Estimated hours" htmlFor="estimated_hours" error={errors.estimated_hours?.message}>
              <Input id="estimated_hours" type="number" step="0.25" min="0" {...register("estimated_hours")} />
            </Field>
            <Field label="Actual hours" htmlFor="actual_hours" error={errors.actual_hours?.message}>
              <Input id="actual_hours" type="number" step="0.25" min="0" {...register("actual_hours")} />
            </Field>
            <Field
              label="Recurring"
              htmlFor="recurrence"
              error={errors.recurrence?.message}
              description="Repeats when completed"
            >
              <Select id="recurrence" {...register("recurrence")}>
                <option value="none">Not recurring</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Create task"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
