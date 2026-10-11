"use client";

import * as React from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <ModalHeader>
        <div className="flex items-start gap-3">
          <div
            className={
              destructive
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            }
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <ModalTitle className="pt-1.5">{title}</ModalTitle>
        </div>
      </ModalHeader>
      {description && (
        <ModalBody className="text-sm text-muted-foreground">{description}</ModalBody>
      )}
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
