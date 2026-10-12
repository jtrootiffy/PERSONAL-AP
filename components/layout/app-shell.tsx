"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { GlobalSearch } from "@/components/layout/global-search";
import type { Notification, Profile, Settings } from "@/lib/types";

const COLLAPSE_KEY = "admin-panel-sidebar-collapsed";

export function AppShell({
  email,
  profile,
  settings,
  notifications,
  children,
}: {
  email: string | null;
  profile: Profile | null;
  settings: Settings | null;
  notifications: Notification[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const brandName = settings?.business_name?.trim() || profile?.full_name || "Admin Panel";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        brandName={brandName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={email}
          profile={profile}
          notifications={notifications}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1400px] flex-1 animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
