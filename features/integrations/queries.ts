import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { connectors } from "@/features/integrations/registry";
import type {
  ConnectorState,
  ConnectorStatus,
  MailMessage,
  CalendarEventItem,
  NotionItem,
} from "@/features/integrations/types";

/**
 * Læselag for Integration Center + connector-data.
 *
 * Robust efter samme princip som resten af LifeOS: hvis Supabase ikke er sat op,
 * eller migration 0004 ikke er kørt endnu, returneres tomme/standard-værdier i
 * stedet for at crashe. RLS sørger for, at man kun ser sine egne data.
 */

/** En standard-tilstand (alt slukket) for en connector der endnu ikke er i db. */
function defaultState(connectorId: string): ConnectorState {
  return {
    connectorId,
    enabled: false,
    status: "disconnected",
    lastSyncedAt: null,
  };
}

/**
 * Tilstand for ALLE connectors i registret (forbundet med db-rækker hvor de
 * findes, ellers standard). Returnerer altid én post pr. connector.
 */
export async function getConnectorStates(): Promise<
  Record<string, ConnectorState>
> {
  const states: Record<string, ConnectorState> = {};
  for (const c of connectors) states[c.id] = defaultState(c.id);

  if (!isSupabaseConfigured()) return states;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integrations")
      .select("connector_id, enabled, status, last_synced_at");

    if (error || !data) return states;

    for (const row of data) {
      const id = row.connector_id as string;
      if (!states[id]) continue; // ukendt connector – ignorér
      states[id] = {
        connectorId: id,
        enabled: Boolean(row.enabled),
        status: (row.status as ConnectorStatus) ?? "disconnected",
        lastSyncedAt: (row.last_synced_at as string | null) ?? null,
      };
    }
    return states;
  } catch {
    return states;
  }
}

/** Id'er på de connectors brugeren har slået TIL (uanset status). */
export async function getEnabledConnectorIds(): Promise<string[]> {
  const states = await getConnectorStates();
  return Object.values(states)
    .filter((s) => s.enabled)
    .map((s) => s.connectorId);
}

// =====================================================================
//  Data-adaptere: læs db-rækker og normalisér til de fælles typer.
// =====================================================================

/** Seneste mails (normaliseret til MailMessage). */
export async function getMailMessages(limit = 50): Promise<MailMessage[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("emails")
      .select("*")
      .order("received_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => {
      const source = (r.source as string | null) ?? null;
      // KILDEN afgør ALTID verdenen: Outlook = Storgaard (arbejde), Gmail =
      // Privat. Historiske rækker kan have forkert workspace i databasen
      // (fra før reglen blev håndhævet) – dette værn normaliserer ved
      // læsning, så en Gmail-mail aldrig kan optræde under Storgaard Biler
      // eller omvendt, uanset hvad der står i rækken.
      const workspace =
        source === "outlook"
          ? "work"
          : source === "gmail"
            ? "private"
            : ((r.workspace as string | null) ?? "shared");
      return {
        id: r.id as string,
        externalId: (r.external_id as string | null) ?? null,
        subject: (r.subject as string | null) ?? "(uden emne)",
        snippet: (r.snippet as string | null) ?? "",
        from: (r.from_addr as string | null) ?? "",
        isRead: Boolean(r.is_read),
        // Defensiv: kolonnen 'replied' findes måske ikke endnu (migration 0017).
        replied: Boolean(r.replied),
        category: (r.category as string | null) ?? null,
        // Defensiv: faktura-kolonnerne findes måske ikke endnu (migration 0018).
        invoiceDueDate: (r.invoice_due_date as string | null) ?? null,
        invoicePaid: Boolean(r.invoice_paid),
        source,
        workspace,
        receivedAt: (r.received_at as string | null) ?? null,
      };
    });
  } catch {
    return [];
  }
}

/** Kommende (og nylige) kalender-events (normaliseret til CalendarEventItem). */
export async function getCalendarEvents(limit = 50): Promise<CalendarEventItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      externalId: (r.external_id as string | null) ?? null,
      title: (r.title as string | null) ?? "(uden titel)",
      description: (r.description as string | null) ?? null,
      location: (r.location as string | null) ?? null,
      startsAt: (r.starts_at as string | null) ?? null,
      endsAt: (r.ends_at as string | null) ?? null,
      allDay: Boolean(r.all_day),
      source: (r.source as string | null) ?? null,
      // Samme kilde-værn som for mails: Outlook-kalender = arbejde,
      // Google Kalender = privat – uanset hvad rækken historisk siger.
      workspace:
        (r.source as string | null) === "outlook"
          ? "work"
          : (r.source as string | null) === "google_calendar"
            ? "private"
            : ((r.workspace as string | null) ?? "shared"),
    }));
  } catch {
    return [];
  }
}

/** Seneste Notion-emner (normaliseret til NotionItem). */
export async function getNotionItems(limit = 50): Promise<NotionItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notion_items")
      .select("*")
      .order("edited_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      externalId: (r.external_id as string | null) ?? null,
      title: (r.title as string | null) ?? "(uden titel)",
      type: (r.type as string | null) ?? null,
      url: (r.url as string | null) ?? null,
      snippet: (r.snippet as string | null) ?? null,
      editedAt: (r.edited_at as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}
