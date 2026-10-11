import { requireUser, getProfile, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateDeadlineNotifications } from "@/lib/server/notifications";
import { AppShell } from "@/components/layout/app-shell";
import { SetupNotice } from "@/components/common/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import type { Notification } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const user = await requireUser();
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);

  const supabase = createClient();

  // Idempotently create any due deadline/overdue reminders before listing.
  await generateDeadlineNotifications(supabase, user.id, settings);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <AppShell
      email={user.email ?? null}
      profile={profile}
      settings={settings}
      notifications={(notifications ?? []) as Notification[]}
    >
      {children}
    </AppShell>
  );
}
