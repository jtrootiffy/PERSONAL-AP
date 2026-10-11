"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import type { Invoice, InvoiceItem } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

/**
 * Renders the create form as a full-page modal. Used by /invoices/new and
 * /invoices/[id]/edit so the heavy line-item editor only loads when needed.
 */
export function InvoiceEditor({
  mode,
  clients,
  projects,
  currency,
  defaultTaxRate,
  paymentTermsDays,
  defaultClientId,
  defaultProjectId,
  initial,
  initialItems,
}: {
  mode: "create" | "edit";
  clients: Option[];
  projects: Option[];
  currency: string;
  defaultTaxRate: number;
  paymentTermsDays: number;
  defaultClientId?: string;
  defaultProjectId?: string;
  initial?: Invoice | null;
  initialItems?: InvoiceItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);

  function close() {
    setOpen(false);
    router.push("/invoices");
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={close}>
          Back to invoices
        </Button>
      </div>
      <InvoiceForm
        open={open}
        onClose={close}
        clients={clients}
        projects={projects}
        currency={currency}
        defaultTaxRate={defaultTaxRate}
        paymentTermsDays={paymentTermsDays}
        defaultClientId={defaultClientId}
        defaultProjectId={defaultProjectId}
        initial={mode === "edit" ? initial : null}
        initialItems={initialItems}
        onSaved={(id) => {
          setOpen(false);
          router.push(`/invoices/${id}`);
          router.refresh();
        }}
      />
    </>
  );
}
