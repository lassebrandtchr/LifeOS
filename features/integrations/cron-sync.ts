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
  const results: SyncResult[] = [];

  try {
    const userIds = await collectConnectedUserIds(supabase);

    for (const userId of userIds) {
      // Google (Gmail + Kalender)
      const googleToken = await getValidAccessTokenFor(supabase, userId);
      if (googleToken) {
        results.push(await syncGmailCore(supabase, userId, googleToken));
        results.push(await syncGoogleCalendarCore(supabase, userId, googleToken));
      }

      // Microsoft (Outlook Mail + Kalender)
      const msToken = await getValidMicrosoftTokenFor(supabase, userId);
      if (msToken) {
        results.push(await syncOutlookMailCore(supabase, userId, msToken));
        results.push(await syncOutlookCalendarCore(supabase, userId, msToken));
      }

      // Notion (Opgaver + Sider)
      const notionToken = await getNotionTokenFor(supabase, userId);
      if (notionToken) {
        results.push(await syncNotionTasksCore(supabase, userId, notionToken));
        results.push(await syncNotionPagesCore(supabase, userId, notionToken));
      }
    }

    return { ok: true, ranAt, users: userIds.length, results };
  } catch (e) {
    return {
      ok: false,
      ranAt,
      users: 0,
      results,
      error: e instanceof Error ? e.message : "Ukendt fejl under synk.",
    };
  }
}
