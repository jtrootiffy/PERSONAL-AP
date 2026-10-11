import type { Metadata } from "next";
import { isSupabaseConfigured, SETUP_TOKEN } from "@/lib/env";
import { SetupForm } from "@/components/auth/setup-form";
import { SetupNotice } from "@/components/common/setup-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Setup" };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  if (!SETUP_TOKEN) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg">Setup is disabled</CardTitle>
            <CardDescription>
              To enable the one-time setup page, set a <code className="rounded bg-muted px-1">SETUP_TOKEN</code>{" "}
              environment variable and restart the app. Alternatively, create the admin account with{" "}
              <code className="rounded bg-muted px-1">npm run create:admin</code>.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            A
          </span>
          <span className="text-base font-semibold">Admin Panel</span>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
