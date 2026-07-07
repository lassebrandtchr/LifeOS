"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { cn, getInitials } from "@/lib/utils";
import { mainNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/shared/logo";
import { Avatar } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/auth/dal";

/**
 * Sidebar – den faste venstre-navigation på tablet/desktop.
 * Viser logo, navigationspunkter (med aktiv markering) og en profil-chip nederst.
 * Inspireret af Arc/Linear: rolig, luftig og overskuelig.
 *
 * To tilstande (styret af Topbar-knappen via SidebarProvider):
 *  - pinnet (collapsed=false): fast i layoutet, fylder 16rem – indholdet ligger
 *    ved siden af.
 *  - foldet ind (collapsed=true): taget ud af layoutet (position: fixed), skjult
 *    ude til venstre. "revealed" (mus i kanten/over sidebaren) skubber den frem
 *    som et overlay. Indholdet bruger så hele bredden.
 */
export function Sidebar({
  user,
  collapsed = false,
  revealed = false,
  onHoverChange,
}: {
  user: SessionUser;
  collapsed?: boolean;
  revealed?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      onMouseEnter={collapsed ? () => onHoverChange?.(true) : undefined}
      onMouseLeave={collapsed ? () => onHoverChange?.(false) : undefined}
      className={cn(
        "app-sidebar hidden h-dvh w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r p-4 transition-transform duration-300 ease-out lg:flex",
        collapsed
          ? "fixed left-0 top-0 z-50 shadow-2xl"
          : "sticky top-0 self-start",
      )}
      style={
        collapsed
          ? { transform: revealed ? "translateX(0)" : "translateX(-100%)" }
          : undefined
      }
    >
      {/* Logo / brand */}
      <Link href="/" className="flex items-center gap-3 px-2 py-3">
        <Logo size={52} />
        <div className="leading-tight">
          <p className="text-sm font-semibold">{siteConfig.name}</p>
          <p className="text-xs text-muted-foreground">Dit AI-styresystem</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="mt-2 flex flex-col gap-1">
        {mainNav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-10 rounded-xl border border-primary/30 bg-primary/10 shadow-glow"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="size-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110" />
              <span className="transition-transform duration-200 ease-out group-hover:translate-x-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Profil-chip nederst – viser den indloggede bruger */}
      <div className="mt-auto">
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
          <Avatar
            src={user.avatarUrl}
            alt={user.name}
            fallback={getInitials(user.name)}
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              {user.status}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
