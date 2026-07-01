"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { siteConfig } from "@/config/site";
import type { SessionUser } from "@/lib/auth/dal";

/**
 * Topbar – øverste bjælke. Indeholder global søgning, notifikationer,
 * tema-skifter, profilmenu og – på mobil – app-logoet.
 */
export function Topbar({ user }: { user: SessionUser }) {
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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifikationer"
          className="relative"
        >
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
        </Button>
        <ThemeToggle />
        {/* Profilmenu (indlogget bruger) – synlig også på mobil */}
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
