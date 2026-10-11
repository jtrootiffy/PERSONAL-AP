"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  deleteProject,
  setProjectArchived,
  setProjectProgressMode,
  setProjectStatus,
  updateProjectProgress,
} from "@/lib/actions/projects";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import type { Project, ProjectStatus } from "@/lib/types";

export function ProjectActions({ project }: { project: Project }) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = React.useState<ProjectStatus>(project.status);
  const [progress, setProgress] = React.useState(project.progress);
  const [savingProgress, setSavingProgress] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setStatus(project.status);
    setProgress(project.progress);
  }, [project.status, project.progress]);

  async function changeStatus(next: ProjectStatus) {
    setStatus(next);
    const res = await setProjectStatus(project.id, next, project.title);
    if (res.ok) {
      toast.success(`Marked as ${PROJECT_STATUS_LABELS[next]}`);
      router.refresh();
    } else {
      toast.error("Could not update status", res.error);
      setStatus(project.status);
    }
  }

  async function saveProgress() {
    setSavingProgress(true);
    const res = await updateProjectProgress(project.id, progress);
    setSavingProgress(false);
    if (res.ok) router.refresh();
    else toast.error("Could not update progress", res.error);
  }

  async function useAuto() {
    const res = await setProjectProgressMode(project.id, "auto");
    if (res.ok) {
      toast.success("Progress now follows completed tasks");
      router.refresh();
    } else toast.error("Could not switch to automatic", res.error);
  }

  async function toggleArchive() {
    const res = await setProjectArchived(project.id, !project.archived);
    if (res.ok) {
      toast.success(project.archived ? "Project restored" : "Project archived");
      router.refresh();
    } else toast.error("Could not update project", res.error);
  }

  async function doDelete() {
    setBusy(true);
    const res = await deleteProject(project.id);
    setBusy(false);
    if (res.ok) {
      toast.success("Project deleted");
      router.push("/projects");
    } else toast.error("Could not delete project", res.error);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Status</p>
        <Select value={status} onChange={(e) => changeStatus(e.target.value as ProjectStatus)}>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Progress {project.progress_mode === "auto" && "(automatic)"}
          </p>
          <span className="text-xs font-medium">{progress}%</span>
        </div>
        <Progress value={progress} tone={progress === 100 ? "success" : "primary"} />
        {project.progress_mode === "manual" ? (
          <div className="mt-3 space-y-2">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveProgress} disabled={savingProgress}>
                {savingProgress && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save progress
              </Button>
              <Button size="sm" variant="ghost" onClick={useAuto}>
                <RotateCcw className="h-3.5 w-3.5" /> Use automatic
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Derived from completed tasks.{" "}
            <button
              onClick={() =>
                updateProjectProgress(project.id, project.progress).then(() => router.refresh())
              }
              className="font-medium text-primary hover:underline"
            >
              Set manually
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={toggleArchive}>
          {project.archived ? "Restore project" : "Archive project"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" /> Delete project
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete this project?"
        confirmLabel="Delete project"
        description="Tasks, invoices and payments are kept for your records but will no longer be linked to this project."
      />
    </div>
  );
}
