"use client";

import * as React from "react";
import { toast } from "sonner";
import { RefreshCw, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  setConnectorEnabled,
  disconnectGoogle,
  syncGoogleCalendar,
  syncGmail,
  disconnectMicrosoft,
  syncMicrosoft,
  disconnectNotion,
  syncNotion,
  syncNotionTasks,
  type IntegrationActionState,
} from "@/features/integrations/actions";
import { NotionConnectDialog } from "@/components/settings/notion-connect-dialog";
import type {
  ConnectorDefinition,
  ConnectorState,
} from "@/features/integrations/types";

/**
 * ConnectorRow – én connector i Integration Center.
 *  - OAuth-connectors (Google): rigtig "Forbind med Google"-knap → /api/...
 *    Når forbundet: "Forbundet" + Synkronisér + Afbryd.
 *  - Øvrige: en simpel til/fra-kontakt (optimistisk, ruller tilbage ved fejl).
 */
export function ConnectorRow({
  connector,
  state,
  googleConnected = false,
  microsoftConnected = false,
  notionConnected = false,
}: {
  connector: ConnectorDefinition;
  state: ConnectorState;
  googleConnected?: boolean;
  microsoftConnected?: boolean;
  notionConnected?: boolean;
}) {
  const [enabled, setEnabled] = React.useState(state.enabled);
  const [pending, startTransition] = React.useTransition();
  const isGoogle = connector.oauth === "google";
  const isMicrosoft = connector.oauth === "microsoft";
  const isNotion = connector.oauth === "notion";

  function onToggle(next: boolean) {
    if (connector.comingSoon || pending) return;
    setEnabled(next);
    startTransition(async () => {
      const res = await setConnectorEnabled(connector.id, next);
      if (res?.error) {
        setEnabled(!next);
        toast.error(res.error);
      } else {
        toast.success(next ? `${connector.name} er klar.` : `${connector.name} er slået fra.`);
      }
    });
  }

  function onDisconnect() {
    startTransition(async () => {
      const res = await disconnectGoogle();
      if (res?.error) toast.error(res.error);
      else toast.success("Google er afbrudt.");
    });
  }

  // Fælles: kør en synk-action og vis ALTID feedback. try/catch er vigtigt –
  // uden det ville en server-action, der kaster/hænger (fx langsom database
  // eller netværk), efterlade knappen tavs ("der sker ingenting"), fordi
  // fejlen forsvinder inde i startTransition uden en toast.
  function runSync(
    action: () => Promise<IntegrationActionState>,
    okFallback: string,
  ) {
    startTransition(async () => {
      try {
        const res = await action();
        if (res?.error) toast.error(res.error, { duration: 8000 });
        else {
          toast.success(res?.message ?? okFallback);
          if (res?.warning) toast.warning(res.warning);
        }
      } catch {
        toast.error("Kunne ikke synkronisere – tjek din forbindelse og prøv igen.");
      }
    });
  }

  function onSync() {
    runSync(syncGoogleCalendar, "Google Kalender synkroniseret ✓");
  }

  // syncGmail() har eksisteret i actions.ts (samme kode-sti som den
  // automatiske baggrunds-synk bruger), men var aldrig koblet til nogen
  // knap i UI'et – "Synkronisér" ud for Gmail var derfor slet ikke der.
  function onSyncGmail() {
    runSync(syncGmail, "Gmail synkroniseret ✓");
  }

  function onDisconnectMicrosoft() {
    startTransition(async () => {
      const res = await disconnectMicrosoft();
      if (res?.error) toast.error(res.error);
      else toast.success("Outlook er afbrudt.");
    });
  }

  function onSyncMicrosoft() {
    startTransition(async () => {
      const res = await syncMicrosoft();
      if (res?.error) toast.error(res.error, { duration: 8000 });
      else toast.success(res?.message ?? "Outlook synkroniseret ✓");
    });
  }

  function onDisconnectNotion() {
    startTransition(async () => {
      const res = await disconnectNotion();
      if (res?.error) toast.error(res.error);
      else toast.success("Notion er afbrudt.");
    });
  }

  function onSyncNotion() {
    startTransition(async () => {
      const res = await syncNotion();
      if (res?.error) toast.error(res.error);
      else toast.success("Notion synkroniseret ✓");
    });
  }

  function onImportNotionTasks() {
    startTransition(async () => {
      const res = await syncNotionTasks();
      if (res?.error) toast.error(res.error, { duration: 8000 });
      else toast.success(res?.message ?? "Opgaver hentet fra Notion ✓");
    });
  }

  // ── Status-badge ──
  const isSynced = state.status === "connected" && Boolean(state.lastSyncedAt);
  let statusBadge: React.ReactNode;
  if (connector.comingSoon) {
    statusBadge = <Badge variant="secondary">Kommer snart</Badge>;
  } else if (isGoogle || isMicrosoft || isNotion) {
    const connected = isGoogle
      ? googleConnected
      : isMicrosoft
        ? microsoftConnected
        : notionConnected;
    statusBadge = connected ? (
      <Badge variant="success">Forbundet</Badge>
    ) : (
      <Badge variant="outline">Ikke forbundet</Badge>
    );
  } else if (enabled && isSynced) {
    statusBadge = <Badge variant="success">Synkroniseret</Badge>;
  } else if (enabled) {
    statusBadge = <Badge variant="success">Slået til</Badge>;
  } else if (connector.availability === "sync") {
    statusBadge = <Badge variant="outline">Klar at forbinde</Badge>;
  } else {
    statusBadge = <Badge variant="secondary">Forbindelse senere</Badge>;
  }

  // ── Højre kontrol ──
  let control: React.ReactNode;
  if (isGoogle && googleConnected) {
    control = (
      <div className="flex shrink-0 items-center gap-2">
        {connector.id === "google_calendar" && (
          <Button variant="outline" onClick={onSync} disabled={pending} className="gap-1.5">
            <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
            Synkronisér
          </Button>
        )}
        {/* Gmail havde tidligere INGEN synk-knap her – kun Afbryd. syncGmail()
            fandtes allerede som server-action (samme sti som baggrunds-
            synken), men var aldrig koblet til noget i UI'et. */}
        {connector.id === "gmail" && (
          <Button variant="outline" onClick={onSyncGmail} disabled={pending} className="gap-1.5">
            <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
            Synkronisér
          </Button>
        )}
        <Button variant="ghost" onClick={onDisconnect} disabled={pending}>
          Afbryd
        </Button>
      </div>
    );
  } else if (isGoogle) {
    control = (
      <a
        href="/api/integrations/google/connect"
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Forbind
      </a>
    );
  } else if (isMicrosoft && microsoftConnected) {
    control = (
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" onClick={onSyncMicrosoft} disabled={pending} className="gap-1.5">
          <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
          Synkronisér
        </Button>
        <Button variant="ghost" onClick={onDisconnectMicrosoft} disabled={pending}>
          Afbryd
        </Button>
      </div>
    );
  } else if (isMicrosoft) {
    control = (
      <a
        href="/api/integrations/microsoft/connect"
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Forbind
      </a>
    );
  } else if (isNotion && notionConnected) {
    control = (
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" onClick={onImportNotionTasks} disabled={pending} className="gap-1.5">
          <ListChecks className={pending ? "size-4 animate-spin" : "size-4"} />
          Hent opgaver
        </Button>
        <Button variant="outline" onClick={onSyncNotion} disabled={pending} className="gap-1.5">
          <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
          Synkronisér
        </Button>
        <Button variant="ghost" onClick={onDisconnectNotion} disabled={pending}>
          Afbryd
        </Button>
      </div>
    );
  } else if (isNotion) {
    control = <NotionConnectDialog />;
  } else {
    control = (
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={connector.comingSoon || pending}
        aria-label={`${enabled ? "Slå fra" : "Slå til"}: ${connector.name}`}
      />
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-secondary/30 p-4">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white text-xl shadow-sm"
      >
        {connector.iconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={connector.iconSrc} alt="" className="size-6 object-contain" loading="lazy" />
        ) : (
          connector.emoji
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{connector.name}</p>
          <span className="text-xs text-muted-foreground">{connector.provider}</span>
          {statusBadge}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{connector.description}</p>
      </div>

      {control}
    </div>
  );
}
