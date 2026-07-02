import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { AutoSync } from "@/components/layout/auto-sync";
import { ReminderWatcher } from "@/components/layout/reminder-watcher";
import { getNotifications } from "@/features/dashboard/notifications";
import type { SessionUser } from "@/lib/auth/dal";

/**
 * AppShell – rammen om hele appen.
 * Layout:  [ Sidebar ] [ Topbar + indhold ]   og en MobileNav i bunden på mobil.
 * Mobile first: på små skærme skjules sidebaren og bund-tab-baren overtager.
 */
export async function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const notifications = await getNotifications();

  return (
    <div className="flex min-h-dvh">
      <AutoSync />
      <ReminderWatcher />
      <AmbientBackground />
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} notifications={notifications} />
        {/* pb-24 giver plads til mobilmenuen i bunden */}
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
