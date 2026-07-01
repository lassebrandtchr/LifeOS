import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { FlashToaster } from "@/components/feedback/flash-toaster";
import { DetailProvider } from "@/components/tasks/detail-context";
import { requireUser } from "@/lib/auth/dal";

/**
 * Layout for hele det "indre" af appen.
 * Alle sider i (app)-gruppen får automatisk sidebar, topbar og mobilmenu.
 *
 * (app) er en "route group": parentesen betyder, at mappenavnet IKKE
 * påvirker URL'en – den er kun til at gruppere sider med samme layout.
 *
 * requireUser() er sikkerhedslag nr. 2 (oven på proxy.ts): er ingen logget ind,
 * sendes brugeren til /login. I demo-tilstand (ingen Supabase) returneres Lasse.
 *
 * DetailProvider ligger her (ét sted, øverst), så opgave-/projekt-detaljen kan
 * åbnes fra ALLE sider (dashboard, Storgaard Biler, Privat, Opgaver, ...) og
 * altid rammer den samme centrerede modal.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <DetailProvider>
      <AppShell user={user}>{children}</AppShell>
      <Suspense fallback={null}>
        <FlashToaster />
      </Suspense>
    </DetailProvider>
  );
}
