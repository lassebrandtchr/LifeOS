import { Plug } from "lucide-react";

import { connectorGroups } from "@/features/integrations/registry";
import type { ConnectorState } from "@/features/integrations/types";
import { ConnectorRow } from "@/components/settings/connector-row";

/**
 * Integration Center – sektion under Indstillinger (Fase 9).
 *
 * Server-komponent: får connector-tilstandene ind og renderer hver gruppe
 * (Mail, Kalender, Noter, Filer). Selve til/fra-kontakten er en lille klient-
 * komponent (ConnectorRow), så siden ellers forbliver server-renderet.
 */
export function IntegrationCenter({
  states,
  googleConnected = false,
  microsoftConnected = false,
  notionConnected = false,
}: {
  states: Record<string, ConnectorState>;
  googleConnected?: boolean;
  microsoftConnected?: boolean;
  notionConnected?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="mb-1 flex items-center gap-2">
        <Plug className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Integrationer</h2>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Forbind dine værktøjer, så LifeOS kan samle mail, kalender og noter ét
        sted. Du tænder og slukker hver enkelt – og intet sendes eller ændres
        uden din godkendelse.
      </p>

      <div className="space-y-6">
        {connectorGroups.map((group) => (
          <div key={group.kind}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span aria-hidden>{group.emoji}</span>
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.connectors.map((connector) => (
                <ConnectorRow
                  key={connector.id}
                  connector={connector}
                  state={states[connector.id]}
                  googleConnected={googleConnected}
                  microsoftConnected={microsoftConnected}
                  notionConnected={notionConnected}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
