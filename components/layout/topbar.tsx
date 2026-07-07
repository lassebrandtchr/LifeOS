"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { useSidebar } from "@/components/layout/sidebar-context";
import { siteConfig } from "@/config/site";
import type { SessionUser } from "@/lib/auth/dal";
import type { NotificationItem } from "@/features/dashboard/notifications";

/**
 * Topbar – øverste bjælke. Indeholder global søgning, notifikationer,
 * tema-skifter, profilmenu og – på mobil – app-logoet.
 */
export function Topbar({
  user,
  notifications,
}: {
  user: SessionUser;
  notifications: NotificationItem[];
}) {
  const { collapsed, toggle } = useSidebar();

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 px-4 lg:px-6">
      {/* Logo (kun mobil – på desktop ligger logoet i sidebaren) */}
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <Logo size={40} />
        <span className="text-sm font-semibold">{siteConfig.name}</span>
      </Link>

      {/* Global søgning (opgaver + projekter) */}
      <div className="ml-auto hidden flex-1 items-center md:ml-0 md:flex md:max-w-md">
        <GlobalSearch />
      </div>

      {/* Handlinger til højre */}
      <div className="ml-auto flex items-center gap-1 md:ml-2">
        {/* Fold sidebaren ind/ud (kun desktop – på mobil styrer bund-menuen).
            Foldet ind: klik "pinner" den tilbage. Pinnet: klik folder den ind. */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Fastgør sidebar" : "Skjul sidebar"}
          title={collapsed ? "Fastgør sidebar" : "Skjul sidebar"}
          className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </button>
        <NotificationsBell items={notifications} />
        <ThemeToggle />
        {/* Profilmenu (indlogget bruger) – synlig også på mobil */}
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
