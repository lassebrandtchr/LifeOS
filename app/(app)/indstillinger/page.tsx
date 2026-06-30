import { ShieldCheck, LogOut, UserRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { getOptionalUser } from "@/lib/auth/dal";
import { logout } from "@/features/auth/actions";
import { getConnectorStates } from "@/features/integrations/queries";
import { isGoogleConnected } from "@/features/integrations/google";
import { isMicrosoftConnected } from "@/features/integrations/microsoft";
import { isNotionConnected } from "@/features/integrations/notion";
import { IntegrationCenter } from "@/components/settings/integration-center";
import { GoogleFlash, MicrosoftFlash } from "@/components/settings/google-flash";

export const metadata = { title: "Indstillinger" };

export default async function IndstillingerPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; microsoft?: string }>;
}) {
  const [
    user,
    connectorStates,
    googleConnected,
    microsoftConnected,
    notionConnected,
    params,
  ] = await Promise.all([
    getOptionalUser(),
    getConnectorStates(),
    isGoogleConnected(),
    isMicrosoftConnected(),
    isNotionConnected(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Indstillinger</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konto, sikkerhed og præferencer.
        </p>
      </div>

      {/* Konto */}
      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Konto</h2>
        </div>
        <div className="flex items-center gap-4">
          <Avatar
            src={user?.avatarUrl}
            alt={user?.name ?? "Bruger"}
            fallback={getInitials(user?.name ?? "?")}
            className="size-14"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{user?.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
      </section>

      {/* Integrationer (Fase 9) */}
      <GoogleFlash status={params.google} />
      <MicrosoftFlash status={params.microsoft} />
      <IntegrationCenter
        states={connectorStates}
        googleConnected={googleConnected}
        microsoftConnected={microsoftConnected}
        notionConnected={notionConnected}
      />

      {/* Sikkerhed */}
      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Sikkerhed</h2>
        </div>

        {/* 2FA – forberedt, men ikke aktivt endnu */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-secondary/40 p-4">
          <div className="min-w-0">
            <p className="font-medium">Tofaktor-godkendelse (2FA)</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Tofaktor-godkendelse kommer i en fremtidig version.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Kommer snart
          </Badge>
        </div>

        {/* Log ud */}
        <form action={logout} className="mt-4">
          <Button type="submit" variant="outline" className="gap-2">
            <LogOut className="size-4" />
            Log ud
          </Button>
        </form>
      </section>
    </div>
  );
}
