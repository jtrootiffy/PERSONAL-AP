"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Bell, Building2, CreditCard, KeyRound, LayoutDashboard, Loader2, Monitor, User } from "lucide-react";
import { settingsSchema, profileSchema, changePasswordSchema, type SettingsInput } from "@/lib/validation";
import { updateProfile, updateSettings } from "@/lib/actions/settings";
import { changePassword } from "@/lib/actions/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/theme-provider";
import {
  CURRENCIES,
  DATE_FORMATS,
  TIMEZONES,
  DASHBOARD_CARDS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile, Settings } from "@/lib/types";

type ProfileInput = z.infer<typeof profileSchema>;
type PasswordInput = z.infer<typeof changePasswordSchema>;

const NOTIFY_OPTIONS = [
  { value: 7, label: "7 days before" },
  { value: 3, label: "3 days before" },
  { value: 1, label: "1 day before" },
  { value: 0, label: "On the day" },
];

export function SettingsView({
  email,
  profile,
  settings,
}: {
  email: string | null;
  profile: Profile | null;
  settings: Settings | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = React.useState("profile");

  const [settingsPending, setSettingsPending] = React.useState(false);
  const [profilePending, setProfilePending] = React.useState(false);
  const [passwordPending, setPasswordPending] = React.useState(false);

  const settingsForm = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: settings?.business_name ?? "",
      business_email: settings?.business_email ?? "",
      business_phone: settings?.business_phone ?? "",
      business_address: settings?.business_address ?? "",
      logo_url: settings?.logo_url ?? "",
      currency: settings?.currency ?? "PHP",
      date_format: settings?.date_format ?? "MMM d, yyyy",
      timezone: settings?.timezone ?? "Asia/Manila",
      theme: (settings?.theme as SettingsInput["theme"]) ?? "system",
      invoice_prefix: settings?.invoice_prefix ?? "INV-",
      invoice_next_number: settings?.invoice_next_number ?? 1,
      payment_terms_days: settings?.payment_terms_days ?? 14,
      default_tax_rate: Number(settings?.default_tax_rate ?? 0),
      default_discount: Number(settings?.default_discount ?? 0),
      notify_in_app: settings?.notify_in_app ?? true,
      notify_email: settings?.notify_email ?? false,
      notify_days_before: settings?.notify_days_before ?? [7, 3, 1, 0],
      dashboard_cards: settings?.dashboard_cards ?? {},
    },
  });

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      avatar_url: profile?.avatar_url ?? "",
    },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  const watched = settingsForm.watch();

  async function onSubmitSettings(values: SettingsInput) {
    setSettingsPending(true);
    const res = await updateSettings(values);
    setSettingsPending(false);
    if (res.ok) {
      toast.success("Settings saved");
      router.refresh();
    } else {
      if (res.fieldErrors) {
        for (const [key, msgs] of Object.entries(res.fieldErrors)) {
          if (msgs?.[0]) settingsForm.setError(key as keyof SettingsInput, { message: msgs[0] });
        }
      }
      toast.error("Could not save settings", res.error);
    }
  }

  async function onSubmitProfile(values: ProfileInput) {
    setProfilePending(true);
    const res = await updateProfile(values);
    setProfilePending(false);
    if (res.ok) {
      toast.success("Profile updated");
      router.refresh();
    } else {
      toast.error("Could not update profile", res.error);
    }
  }

  async function onSubmitPassword(values: PasswordInput) {
    setPasswordPending(true);
    const res = await changePassword(values);
    setPasswordPending(false);
    if (res.ok) {
      toast.success("Password changed");
      passwordForm.reset();
    } else {
      toast.error("Could not change password", res.error);
    }
  }

  function toggleDay(day: number) {
    const current = watched.notify_days_before ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => b - a);
    settingsForm.setValue("notify_days_before", next, { shouldDirty: true });
  }

  function toggleCard(key: string) {
    const current = watched.dashboard_cards ?? {};
    settingsForm.setValue(
      "dashboard_cards",
      { ...current, [key]: !(current[key] ?? true) },
      { shouldDirty: true },
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="profile">
          <User className="h-4 w-4" /> Profile
        </TabsTrigger>
        <TabsTrigger value="business">
          <Building2 className="h-4 w-4" /> Business
        </TabsTrigger>
        <TabsTrigger value="invoicing">
          <CreditCard className="h-4 w-4" /> Invoicing
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="h-4 w-4" /> Notifications
        </TabsTrigger>
        <TabsTrigger value="dashboard">
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </TabsTrigger>
        <TabsTrigger value="appearance">
          <Monitor className="h-4 w-4" /> Appearance
        </TabsTrigger>
        <TabsTrigger value="security">
          <KeyRound className="h-4 w-4" /> Security
        </TabsTrigger>
      </TabsList>

      {/* Profile */}
      <TabsContent value="profile">
        <form onSubmit={profileForm.handleSubmit(onSubmitProfile)}>
          <Card>
            <CardHeader>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>How you appear in the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name={profileForm.watch("full_name") || email} src={profileForm.watch("avatar_url")} size={56} />
                <div>
                  <p className="text-sm font-medium">{profileForm.watch("full_name") || "Your name"}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="full_name" error={profileForm.formState.errors.full_name?.message}>
                  <Input id="full_name" {...profileForm.register("full_name")} />
                </Field>
                <Field label="Email" htmlFor="email" description="Managed by Supabase Auth">
                  <Input id="email" value={email ?? ""} disabled />
                </Field>
              </div>
              <Field
                label="Avatar URL"
                htmlFor="avatar_url"
                error={profileForm.formState.errors.avatar_url?.message}
                description="Paste a link to a square image."
              >
                <Input id="avatar_url" placeholder="https://…" {...profileForm.register("avatar_url")} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={profilePending}>
                  {profilePending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Business */}
      <TabsContent value="business">
        <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)}>
          <Card>
            <CardHeader>
              <CardTitle>Business details</CardTitle>
              <CardDescription>Shown on your invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Business name" htmlFor="business_name" error={settingsForm.formState.errors.business_name?.message}>
                  <Input id="business_name" placeholder="Your name or studio" {...settingsForm.register("business_name")} />
                </Field>
                <Field label="Business email" htmlFor="business_email" error={settingsForm.formState.errors.business_email?.message}>
                  <Input id="business_email" type="email" {...settingsForm.register("business_email")} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Phone" htmlFor="business_phone" error={settingsForm.formState.errors.business_phone?.message}>
                  <Input id="business_phone" {...settingsForm.register("business_phone")} />
                </Field>
                <Field label="Logo URL" htmlFor="logo_url" error={settingsForm.formState.errors.logo_url?.message}>
                  <Input id="logo_url" placeholder="https://…" {...settingsForm.register("logo_url")} />
                </Field>
              </div>
              <Field label="Address" htmlFor="business_address" error={settingsForm.formState.errors.business_address?.message}>
                <Textarea id="business_address" rows={3} {...settingsForm.register("business_address")} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={settingsPending}>
                  {settingsPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save business details
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Invoicing */}
      <TabsContent value="invoicing">
        <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)}>
          <Card>
            <CardHeader>
              <CardTitle>Invoicing defaults</CardTitle>
              <CardDescription>Used to prefill new invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Currency" htmlFor="currency" error={settingsForm.formState.errors.currency?.message}>
                  <Select id="currency" {...settingsForm.register("currency")}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Invoice prefix" htmlFor="invoice_prefix" error={settingsForm.formState.errors.invoice_prefix?.message}>
                  <Input id="invoice_prefix" {...settingsForm.register("invoice_prefix")} />
                </Field>
                <Field label="Next number" htmlFor="invoice_next_number" error={settingsForm.formState.errors.invoice_next_number?.message}>
                  <Input id="invoice_next_number" type="number" min="1" {...settingsForm.register("invoice_next_number")} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Payment terms (days)" htmlFor="payment_terms_days" error={settingsForm.formState.errors.payment_terms_days?.message}>
                  <Input id="payment_terms_days" type="number" min="0" {...settingsForm.register("payment_terms_days")} />
                </Field>
                <Field label="Default tax rate %" htmlFor="default_tax_rate" error={settingsForm.formState.errors.default_tax_rate?.message}>
                  <Input id="default_tax_rate" type="number" step="0.01" min="0" {...settingsForm.register("default_tax_rate")} />
                </Field>
                <Field label="Default discount %" htmlFor="default_discount" error={settingsForm.formState.errors.default_discount?.message}>
                  <Input id="default_discount" type="number" step="0.01" min="0" {...settingsForm.register("default_discount")} />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                The invoice number rolls forward automatically each time you create an invoice.
              </p>
              <div className="flex justify-end">
                <Button type="submit" disabled={settingsPending}>
                  {settingsPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save invoicing
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Notifications */}
      <TabsContent value="notifications">
        <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)}>
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Control how you are reminded about deadlines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleRow
                title="In-app notifications"
                description="Show reminders in the bell menu for upcoming and overdue items."
                checked={settingsForm.watch("notify_in_app")}
                onChange={(v) => settingsForm.setValue("notify_in_app", v, { shouldDirty: true })}
              />
              <ToggleRow
                title="Email notifications"
                description="Requires email delivery to be configured on your Supabase project (or an SMTP/Resend key). Off by default."
                checked={settingsForm.watch("notify_email")}
                onChange={(v) => settingsForm.setValue("notify_email", v, { shouldDirty: true })}
                badge="Needs setup"
              />

              <div>
                <p className="text-sm font-medium">Remind me</p>
                <p className="text-xs text-muted-foreground">Choose when deadlines trigger a notification.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {NOTIFY_OPTIONS.map((opt) => {
                    const active = (settingsForm.watch("notify_days_before") ?? []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleDay(opt.value)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={settingsPending}>
                  {settingsPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Dashboard */}
      <TabsContent value="dashboard">
        <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)}>
          <Card>
            <CardHeader>
              <CardTitle>Dashboard cards</CardTitle>
              <CardDescription>Pick which summary cards appear on your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DASHBOARD_CARDS.map((c) => {
                  const on = (settingsForm.watch("dashboard_cards") ?? {})[c.key] ?? true;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleCard(c.key)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        on ? "border-primary/50 bg-primary/5" : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <span>{c.label}</span>
                      <span
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          on ? "bg-primary" : "bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                            on ? "left-4" : "left-0.5",
                          )}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={settingsPending}>
                  {settingsPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Appearance */}
      <TabsContent value="appearance">
        <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)}>
          <Card>
            <CardHeader>
              <CardTitle>Appearance & locale</CardTitle>
              <CardDescription>Theme is applied instantly; other options save with the form.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTheme(t);
                        settingsForm.setValue("theme", t, { shouldDirty: true });
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors",
                        theme === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date format" htmlFor="date_format" error={settingsForm.formState.errors.date_format?.message}>
                  <Select id="date_format" {...settingsForm.register("date_format")}>
                    {DATE_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Timezone" htmlFor="timezone" error={settingsForm.formState.errors.timezone?.message}>
                  <Select id="timezone" {...settingsForm.register("timezone")}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={settingsPending}>
                  {settingsPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save appearance
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Security */}
      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>You will stay signed in on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
              <Field label="Current password" htmlFor="currentPassword" error={passwordForm.formState.errors.currentPassword?.message} required>
                <Input id="currentPassword" type="password" autoComplete="current-password" {...passwordForm.register("currentPassword")} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="New password" htmlFor="password" error={passwordForm.formState.errors.password?.message} required>
                  <Input id="password" type="password" autoComplete="new-password" {...passwordForm.register("password")} />
                </Field>
                <Field label="Confirm new password" htmlFor="confirmPassword" error={passwordForm.formState.errors.confirmPassword?.message} required>
                  <Input id="confirmPassword" type="password" autoComplete="new-password" {...passwordForm.register("confirmPassword")} />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={passwordPending}>
                  {passwordPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          {title}
          {badge && <Badge tone="warning">{badge}</Badge>}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
        aria-pressed={checked}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "left-4" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
