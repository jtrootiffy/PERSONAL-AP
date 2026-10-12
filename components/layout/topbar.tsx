"use client";

import * as React from "react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";
import type { Notification, Profile } from "@/lib/types";

export function Topbar({
  email,
  profile,
  notifications,
  onOpenSearch,
  onOpenMobile,
}: {
  email: string | null;
  profile: Profile | null;
  notifications: Notification[];
  onOpenSearch: () => void;
  onOpenMobile: () => void;
}) {
  return (
    <header className="no-print glass-bar sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-border/60 px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobile}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <button
        onClick={onOpenSearch}
        className="group flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-border/70 bg-card/70 px-3.5 text-sm text-muted-foreground shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-card hover:text-foreground sm:max-w-md"
      >
        <Search className="h-4 w-4 transition-colors group-hover:text-primary" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded-lg border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu notifications={notifications} />
        <UserMenu email={email} profile={profile} />
      </div>
    </header>
  );
}
