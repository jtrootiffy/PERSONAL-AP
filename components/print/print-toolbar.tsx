"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="no-print flex items-center justify-between gap-3 pb-6">
      <a href={backHref} className="text-sm font-medium text-primary hover:underline">
        ← Back to invoice
      </a>
      <Button onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </Button>
    </div>
  );
}