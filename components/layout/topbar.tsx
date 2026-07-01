"use client";

import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsBell } from "@/components/layout/notifications-bell";
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
        <NotificationsBell items={notifications} />
        <ThemeToggle />
        {/* Profilmenu (indlogget bruger) – synlig også på mobil */}
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
