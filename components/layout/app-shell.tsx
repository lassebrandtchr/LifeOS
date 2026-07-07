import { AppShellClient } from "@/components/layout/app-shell-client";
import { getNotifications } from "@/features/dashboard/notifications";
import type { SessionUser } from "@/lib/auth/dal";

/**
 * AppShell – rammen om hele appen.
 * Layout:  [ Sidebar ] [ Topbar + indhold ]   og en MobileNav i bunden på mobil.
 * Mobile first: på små skærme skjules sidebaren og bund-tab-baren overtager.
 *
 * Selve layoutet (og sidebarens fold-ind/ud) ligger i AppShellClient –
 * denne server-komponent henter blot notifikationer og sender dem videre.
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
    <AppShellClient user={user} notifications={notifications}>
      {children}
    </AppShellClient>
  );
}
