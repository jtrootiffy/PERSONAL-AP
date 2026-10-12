import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/common/setup-notice";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-4">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-3">
          <span className="gradient-primary flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-glow">
            A
          </span>
          <div className="text-center">
            <p className="text-base font-semibold tracking-tight">Admin Panel</p>
            <p className="text-xs text-muted-foreground">
              Your personal workspace
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
