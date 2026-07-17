"use client";

import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { AutoSync } from "@/components/layout/auto-sync";
import { ReminderWatcher } from "@/components/layout/reminder-watcher";
import { InvoiceReminder } from "@/components/layout/invoice-reminder";
import { WorkModeRefresher } from "@/components/layout/work-mode-refresher";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import type { SessionUser } from "@/lib/auth/dal";
import type { NotificationItem } from "@/features/dashboard/notifications";

/**
 * AppShellClient – den klientside-ramme der styrer sidebarens fold-ind/ud.
 * AppShell (server) henter notifikationer og sender dem + brugeren herind.
 */
export function AppShellClient({
  user,
  notifications,
  children,
}: {
  user: SessionUser;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ShellLayout user={user} notifications={notifications}>
        {children}
      </ShellLayout>
    </SidebarProvider>
  );
}

function ShellLayout({
  user,
  notifications,
  children,
}: {
  user: SessionUser;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const { collapsed } = useSidebar();
  // Når sidebaren er foldet ind, afgør "hovered" om den midlertidigt vises
  // som overlay (mus i venstre kant eller over selve sidebaren).
  const [hovered, setHovered] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <AutoSync />
      <ReminderWatcher />
      <InvoiceReminder />
      <WorkModeRefresher />
      <AmbientBackground />

      {/* Usynlig hover-zone i venstre kant – kun når sidebaren er foldet ind.
          At føre musen herud får sidebaren til at poppe frem igen. */}
      {collapsed && (
        <div
          aria-hidden
          className="fixed left-0 top-0 z-40 hidden h-dvh w-3 lg:block"
          onMouseEnter={() => setHovered(true)}
        />
      )}

      <Sidebar
        user={user}
        collapsed={collapsed}
        revealed={hovered}
        onHoverChange={setHovered}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} notifications={notifications} />
        {/* Plads til mobilmenuen i bunden: dens højde (min. 4rem) + luft +
            telefonens safe-area (hjemme-indikatoren). Var før en fast pb-24,
            som ikke tog højde for safe-area og derfor kunne lade indholdet
            gemme sig bag baren på iPhone. */}
        <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
