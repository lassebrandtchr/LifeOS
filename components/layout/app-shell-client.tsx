"use client";

import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
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
        {/* Bund-tab-baren er fjernet – navigation på mobil sker nu via
            hamburger-menuen (fuldskærms-overlay) øverst til højre. Der er derfor
            ikke længere brug for stor bund-margen; kun luft + telefonens
            safe-area (hjemme-indikatoren), så indholdet ikke klæber til kanten. */}
        <main className="flex-1 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
