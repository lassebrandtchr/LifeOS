import "server-only";

import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getValidAccessTokenFor } from "@/features/integrations/google";
import { getValidMicrosoftTokenFor } from "@/features/integrations/microsoft";
import { getNotionTokenFor } from "@/features/integrations/notion";
import {
  syncGoogleCalendarCore,
  syncGmailCore,
  syncOutlookCalendarCore,
  syncOutlookMailCore,
  syncNotionTasksCore,
  syncNotionPagesCore,
  type SyncResult,
} from "@/features/integrations/sync-core";

/**
 * AUTOMATISK BAGGRUNDS-SYNK (cron, hver 15. min).
 *
 * Kører UDEN en indlogget bruger – derfor service-role admin-klienten.
 * Finder alle brugere med en forbindelse og synker det, hver enkelt har sat op:
 *   • Google:    Gmail + Google Kalender
 *   • Microsoft: Outlook Mail + Outlook Kalender
 *   • Notion:    Opgaver + Sider
 *
 * Returnerer en oversigt, så cron-ruten kan logge hvad der skete.
 */

export type CronSyncSummary = {
  ok: boolean;
  ranAt: string;
  users: number;
  results: SyncResult[];
  error?: string;
};

/** Saml alle bruger-id'er, der har mindst én forbindelse. */
async function collectConnectedUserIds(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  const ids = new Set<string>();
  for (const table of [
    "google_connections",
    "microsoft_connections",
    "notion_connections",
  ]) {
    const { data } = await supabase.from(table).select("user_id");
    for (const row of data ?? []) {
      if (row.user_id) ids.add(row.user_id as string);
    }
  }
  return [...ids];
}

export async function runAutomaticSync(): Promise<CronSyncSummary> {
  const ranAt = new Date().toISOString();

  if (!isAdminConfigured()) {
    return {
      ok: false,
      ranAt,
      users: 0,
      results: [],
      error: "SUPABASE_SERVICE_ROLE_KEY mangler – kan ikke køre baggrunds-synk.",
    };
  }

  const supabase = createAdminClient();

  try {
    const userIds = await collectConnectedUserIds(supabase);

    // Alle udbydere pr. bruger er UAFHÆNGIGE netværkskald (og brugerne er
    // uafhængige af hinanden), men blev tidligere kørt ét ad gangen i et
    // for-loop. Summen af alle de sekventielle kald voksede med mailboks-
    // /opgave-mængden og ramte til sidst Vercels maxDuration (60s) ->
    // FUNCTION_INVOCATION_TIMEOUT (504). Kør dem parallelt i stedet, så
    // den samlede tid er den LANGSOMSTE ene synk, ikke summen af dem alle.
    const perUser = userIds.map(async (userId) => {
      const [googleToken, msToken, notionToken] = await Promise.all([
        getValidAccessTokenFor(supabase, userId),
        getValidMicrosoftTokenFor(supabase, userId),
        getNotionTokenFor(supabase, userId),
      ]);

      const tasks: Promise<SyncResult>[] = [];
      if (googleToken) {
        tasks.push(syncGmailCore(supabase, userId, googleToken));
        tasks.push(syncGoogleCalendarCore(supabase, userId, googleToken));
      }
      if (msToken) {
        tasks.push(syncOutlookMailCore(supabase, userId, msToken));
        tasks.push(syncOutlookCalendarCore(supabase, userId, msToken));
      }
      if (notionToken) {
        tasks.push(syncNotionTasksCore(supabase, userId, notionToken));
        tasks.push(syncNotionPagesCore(supabase, userId, notionToken));
      }
      return Promise.all(tasks);
    });

    const results = (await Promise.all(perUser)).flat();

    return { ok: true, ranAt, users: userIds.length, results };
  } catch (e) {
    return {
      ok: false,
      ranAt,
      users: 0,
      results: [],
      error: e instanceof Error ? e.message : "Ukendt fejl under synk.",
    };
  }
}
