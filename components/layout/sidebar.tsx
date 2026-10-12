"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  Users,
  FileText,
  Wallet,
  Receipt,
  StickyNote,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  Users,
  FileText,
  Wallet,
  Receipt,
  StickyNote,
  BarChart3,
  Settings,
};

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  brandName,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  brandName: string;
}) {
  const pathname = usePathname();

  React.useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const renderNav = (isCollapsed: boolean) => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onCloseMobile}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ease-smooth",
              active
                ? "gradient-primary text-white shadow-sm shadow-primary/30"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed && "justify-center px-0",
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                !active && "group-hover:scale-105",
              )}
            />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
          <span className="gradient-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm shadow-primary/30">
            {brandName.slice(0, 1).toUpperCase()}
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold">{brandName}</span>
          )}
        </div>
        {renderNav(collapsed)}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 animate-slide-in-left flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-soft-lg">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2.5">
                <span className="gradient-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm shadow-primary/30">
                  {brandName.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-sm font-semibold">{brandName}</span>
              </div>
              <button
                onClick={onCloseMobile}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNav(false)}
          </aside>
        </div>
      )}
    </>
  );
}
