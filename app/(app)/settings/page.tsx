import { getProfile, getSettings, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your profile, business details, invoice defaults and preferences."
      />
      <SettingsView email={user.email ?? null} profile={profile} settings={settings} />
    </div>
  );
}
