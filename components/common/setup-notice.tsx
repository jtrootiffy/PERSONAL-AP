import Link from "next/link";
import { Database, KeyRound, TerminalSquare } from "lucide-react";

/**
 * Shown instead of the app when Supabase has not been configured yet, so the
 * user gets clear instructions instead of an opaque crash.
 */
export function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Connect your Supabase project</h1>
            <p className="text-sm text-muted-foreground">
              The dashboard needs a database before it can run.
            </p>
          </div>
        </div>

        <ol className="mt-6 space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              1
            </span>
            <div>
              Create a project at{" "}
              <a
                className="font-medium text-primary hover:underline"
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                supabase.com/dashboard
              </a>
              .
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              2
            </span>
            <div>
              Copy <code className="rounded bg-muted px-1.5 py-0.5">.env.example</code> to{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code> and fill in the
              Project URL, anon key and service-role key from{" "}
              <span className="font-medium">Project Settings → API</span>.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              3
            </span>
            <div className="flex items-start gap-2">
              <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                Apply the migrations, then create your admin account:
                <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                  supabase db push{"\n"}npm run create:admin
                </pre>
              </div>
            </div>
          </li>
        </ol>

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <KeyRound className="h-4 w-4 shrink-0" />
          Secrets stay server-side. The service-role key is only used by the setup script and the
          one-time <code className="mx-1 rounded bg-background px-1">/setup</code> page.
        </div>

        <p className="mt-6 text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Reload once configured →
          </Link>
        </p>
      </div>
    </div>
  );
}
