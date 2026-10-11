import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/common/setup-notice";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            A
          </span>
          <span className="text-base font-semibold">Admin Panel</span>
        </div>
        {children}
      </div>
    </div>
  );
}
