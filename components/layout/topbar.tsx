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
    <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
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
        className="group flex h-9 flex-1 items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent sm:max-w-md"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
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
