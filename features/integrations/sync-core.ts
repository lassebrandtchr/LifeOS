import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { listCalendars, listEventsFromCalendar } from "@/lib/google/calendar";
import { listGmailMessages, GmailApiError } from "@/lib/google/gmail";
import { listOutlookMessages, listOutlookEvents } from "@/lib/microsoft/graph";
import {
  listNotionDatabases,
  queryNotionDatabase,
  searchNotion,
} from "@/lib/notion/client";
import { parseTaskInput } from "@/features/tasks/parse";
import { categorizeEmail } from "@/features/integrations/categorize";
import {
  mapRowToTask,
  deriveBucket,
  workspaceForDatabase,
} from "@/features/integrations/notion-tasks";

/**
 * KERNE-SYNK – ren logik der henter data fra en udbyder og skriver til LifeOS.
 *
 * Hver funktion tager en EKSPLICIT supabase-klient + userId + et gyldigt token.
 * Derfor kan PRÆCIS samme kode bruges af:
 *   • de manuelle "Synk nu"-knapper (cookie-klient, den indloggede bruger), og
 *   • det automatiske cron-job hver 15. min (service-role admin-klient).
 *
 * Funktionerne kalder IKKE revalidatePath – det gør kalderen (route/action).
 */

export type SyncResult = {
  source: string;
  ok: boolean;
  count?: number;
  error?: string;
};

async function markSynced(
  supabase: SupabaseClient,
  userId: string,
  connectorId: string,
) {
  await supabase
    .from("integrations")
    .update({ status: "connected", last_synced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
}

/**
 * Udleder en prioritet ud fra deadline, når teksten ikke selv afslører den,
 * så ikke ALT lander som "kan vente".
 */
function derivePriority(deadlineISO: string | null, status: string): string {
  if (status === "done" || status === "archived") return "can_wait";
  if (!deadlineISO) return "can_wait";
  const deadline = new Date(deadlineISO).getTime();
  if (Number.isNaN(deadline)) return "can_wait";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((deadline - startOfToday.getTime()) / 86_400_000);
  if (diffDays <= 0) return "urgent";
  if (diffDays <= 2) return "important";
  return "can_wait";
}

// ───────────────────────────── Google Kalender ──────────────────────────
export async function syncGoogleCalendarCore(
  supabase: SupabaseClient,
  userId: string,
  token: string,
): Promise<SyncResult> {
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 14 * 86_400_000).toISOString();
    const to = new Date(now.getTime() + 120 * 86_400_000).toISOString();

    const calendars = await listCalendars(token);
    if (calendars.length === 0) {
      return { source: "google_calendar", ok: false, error: "Kunne ikke læse kalendere." };
    }

    const lists = await Promise.all(
      calendars.map((c) => listEventsFromCalendar(token, c, from, to)),
    );
    const seen = new Set<string>();
    const rows: Record<string, unknown>[] = [];
    for (const list of lists) {
      for (const e of list) {
        if (!e.startISO || !e.id || seen.has(e.id)) continue;
        seen.add(e.id);
        rows.push({
          user_id: userId,
          source: "google_calendar",
          external_id: e.id,
          title: e.summary,
          description: e.description,
          location: e.location,
          starts_at: e.startISO,
          ends_at: e.endISO,
          all_day: e.allDay,
          // Google Kalender = ALTID privat. Arbejdskalenderen kommer
          // udelukkende fra Outlook (Lasses faste regel) – tidligere kunne
          // et #arbejde-tag i titlen flytte et Google-event til Storgaard.
          workspace: "private",
        });
      }
    }

    if (rows.length === 0) {
      return { source: "google_calendar", ok: true, count: 0 };
    }
    await supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", userId)
      .eq("source", "google_calendar")
      .gte("starts_at", from)
      .lte("starts_at", to);
    await supabase.from("calendar_events").insert(rows);
    await markSynced(supabase, userId, "google_calendar");
    return { source: "google_calendar", ok: true, count: rows.length };
  } catch {
    return { source: "google_calendar", ok: false, error: "Synk fejlede." };
  }
}

// ───────────────────────────────── Gmail ────────────────────────────────
export async function syncGmailCore(
  supabase: SupabaseClient,
  userId: string,
  token: string,
): Promise<SyncResult> {
  try {
    const messages = await listGmailMessages(token, 25);
    if (messages.length === 0) return { source: "gmail", ok: true, count: 0 };

    const rows = messages.map((m) => ({
      user_id: userId,
      source: "gmail",
      external_id: m.id,
      subject: m.subject,
      snippet: m.snippet,
      from_addr: m.from,
      is_read: m.isRead,
      received_at: m.receivedISO,
      // Gmail = privat verden (Storgaard-mail kommer via Outlook).
      workspace: "private",
      // Meningsfuld kategori ud fra afsender/emne/uddrag (regelbaseret).
      category: categorizeEmail({ from: m.from ?? "", subject: m.subject, snippet: m.snippet }),
    }));

    await supabase.from("emails").delete().eq("user_id", userId).eq("source", "gmail");
    await supabase.from("emails").insert(rows);
    await markSynced(supabase, userId, "gmail");
    return { source: "gmail", ok: true, count: rows.length };
  } catch (e) {
    // listGmailMessages kaster nu en rigtig fejl ved et fejlet API-kald
    // (fx udløbet token) i stedet for at give en tom liste – ellers ville
    // et fejlet kald blive fortolket som "tom indbakke", og den gamle,
    // stadig-forkerte cache ville aldrig blive opdateret eller flagget.
    //
    // Er det en GmailApiError, tager vi Googles EGEN forklaring (reason) med
    // i fejlteksten, så syncGmail-action'en kan skelne "manglende scope" fra
    // "API'et er slået fra" og give den rigtige handlingsanvisning.
    if (e instanceof GmailApiError) {
      return { source: "gmail", ok: false, error: `${e.message} ${e.reason}`.trim() };
    }
    return { source: "gmail", ok: false, error: e instanceof Error ? e.message : "Synk fejlede." };
  }
}

// ──────────────────────────── Outlook Kalender ──────────────────────────
export async function syncOutlookCalendarCore(
  supabase: SupabaseClient,
  userId: string,
  token: string,
): Promise<SyncResult> {
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 14 * 86_400_000).toISOString();
    const to = new Date(now.getTime() + 120 * 86_400_000).toISOString();

    const events = await listOutlookEvents(token, from, to);
    const rows = events
      .filter((e) => e.startISO && e.id)
      .map((e) => ({
        user_id: userId,
        source: "outlook",
        external_id: e.id,
        title: e.subject,
        description: e.description,
        location: e.location,
        starts_at: e.startISO,
        ends_at: e.endISO,
        all_day: e.allDay,
        // Outlook-kalenderen = Storgaard = arbejde.
        workspace: "work",
      }));

    if (rows.length === 0) return { source: "outlook_calendar", ok: true, count: 0 };
    await supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", userId)
      .eq("source", "outlook")
      .gte("starts_at", from)
      .lte("starts_at", to);
    await supabase.from("calendar_events").insert(rows);
    await markSynced(supabase, userId, "outlook_calendar");
    return { source: "outlook_calendar", ok: true, count: rows.length };
  } catch (e) {
    // listOutlookEvents kaster nu en rigtig fejl ved et fejlet API-kald
    // (samme rettelse som Gmail/Outlook mail), så den bliver fanget her.
    return { source: "outlook_calendar", ok: false, error: e instanceof Error ? e.message : "Synk fejlede." };
  }
}

// ────────────────────────────── Outlook Mail ────────────────────────────
export async function syncOutlookMailCore(
  supabase: SupabaseClient,
  userId: string,
  token: string,
): Promise<SyncResult> {
  try {
    const messages = await listOutlookMessages(token, 30);
    if (messages.length === 0) return { source: "outlook_mail", ok: true, count: 0 };

    const rows = messages.map((m) => ({
      user_id: userId,
      source: "outlook",
      external_id: m.id,
      subject: m.subject,
      snippet: m.snippet,
      from_addr: m.from,
      is_read: m.isRead,
      received_at: m.receivedISO,
      // Outlook-mail = Storgaard = arbejde.
      workspace: "work",
      // Meningsfuld kategori ud fra afsender/emne/uddrag (regelbaseret).
      category: categorizeEmail({ from: m.from ?? "", subject: m.subject, snippet: m.snippet }),
    }));

    await supabase.from("emails").delete().eq("user_id", userId).eq("source", "outlook");
    await supabase.from("emails").insert(rows);
    await markSynced(supabase, userId, "outlook_mail");
    return { source: "outlook_mail", ok: true, count: rows.length };
  } catch (e) {
    // Samme rettelse som Gmail: listOutlookMessages kaster nu en rigtig
    // fejl ved et fejlet API-kald, i stedet for at et fejlet kald blev
    // fortolket som "tom indbakke" og lod en forældet cache stå uændret.
    return { source: "outlook_mail", ok: false, error: e instanceof Error ? e.message : "Synk fejlede." };
  }
}

// ─────────────────────────────── Notion-sider ───────────────────────────
export async function syncNotionPagesCore(
  supabase: SupabaseClient,
  userId: string,
  token: string,
): Promise<SyncResult> {
  try {
    const pages = await searchNotion(token, 50);
    // SIKKERHEDSLÅS (samme mønster som kalender-synken): ryd kun + genindsæt
    // hvis vi rent faktisk hentede noget. Ellers ville en tom/fejlende
    // Notion-hentning kunne slette alt uden at gemme noget nyt.
    if (pages.length === 0) {
      return { source: "notion_pages", ok: true, count: 0 };
    }
    await supabase.from("notion_items").delete().eq("user_id", userId);
    const rows = pages.map((p) => ({
      user_id: userId,
      external_id: p.id,
      title: p.title,
      type: p.type,
      url: p.url,
      snippet: p.snippet,
      edited_at: p.editedISO,
      workspace: "work",
    }));
    await supabase.from("notion_items").insert(rows);
    await markSynced(supabase, userId, "notion");
    return { source: "notion_pages", ok: true, count: pages.length };
  } catch (e) {
    // searchNotion kaster nu en rigtig fejl ved et fejlet kald (samme
    // rettelse som Gmail/Outlook), så den bliver fanget her i stedet for
    // at blive fortolket som "ingen sider fundet".
    return { source: "notion_pages", ok: false, error: e instanceof Error ? e.message : "Synk fejlede." };
  }
}

// ──────────────────────────── Notion-opgaver ────────────────────────────
export async function syncNotionTasksCore(
  supabase: SupabaseClient,
  userId: string,
  token: string,
): Promise<SyncResult> {
  try {
    const databases = await listNotionDatabases(token);
    const relevant = databases
      .map((db) => ({ ...db, workspace: workspaceForDatabase(db.title) }))
      .filter((db): db is typeof db & { workspace: "work" | "private" } =>
        db.workspace !== null,
      );

    if (relevant.length === 0) {
      return { source: "notion_tasks", ok: false, error: "Ingen kendte databaser." };
    }

    type Mapped = {
      notionId: string;
      title: string;
      deadline: string | null;
      status: string;
      done: boolean;
      category: string | null;
      workArea: string | null;
      workspace: "work" | "private";
      priority: string;
    };
    const mapped: Mapped[] = [];
    for (const db of relevant) {
      const rows = await queryNotionDatabase(token, db.id);
      for (const row of rows) {
        const t = mapRowToTask(row);
        if (!t) continue;
        const parsed = parseTaskInput(t.title);
        const workspace = parsed.workspace ?? db.workspace;
        const category = t.category ?? parsed.categoryId;
        const priority = parsed.priority ?? derivePriority(t.deadline, t.status);
        mapped.push({ ...t, workspace, category, priority });
      }
    }

    if (mapped.length === 0) return { source: "notion_tasks", ok: true, count: 0 };

    const { data: existing } = await supabase
      .from("tasks")
      .select("id, notion_id, status")
      .eq("user_id", userId)
      .not("notion_id", "is", null);

    const byNotionId = new Map<string, { id: string; status: string }>();
    for (const r of existing ?? []) {
      if (r.notion_id) byNotionId.set(r.notion_id as string, { id: r.id as string, status: r.status as string });
    }

    const toInsert: Record<string, unknown>[] = [];
    let updated = 0;
    for (const t of mapped) {
      const completed_at =
        t.done || t.status === "done" ? new Date().toISOString() : null;
      const tags = t.workArea ? [t.workArea] : [];
      const local = byNotionId.get(t.notionId);

      if (local) {
        const update: Record<string, unknown> = {
          title: t.title,
          deadline: t.deadline,
          category: t.category,
          workspace: t.workspace,
          priority: t.priority,
        };
        // Synkroniseringen er kun én vej (Notion → LifeOS, ingen write-back),
        // så en Notion-side der stadig står som åben må ALDRIG genåbne en
        // opgave, brugeren allerede har markeret som færdig her i appen –
        // ellers "genopstår" netop-afkrydsede opgaver ved næste synk.
        if (local.status !== "done") {
          update.status = t.status;
          update.completed_at = completed_at;
        }
        await supabase
          .from("tasks")
          .update(update)
          .eq("id", local.id)
          .eq("user_id", userId);
        updated++;
      } else {
        toInsert.push({
          user_id: userId,
          title: t.title,
          workspace: t.workspace,
          source: "notion",
          notion_id: t.notionId,
          deadline: t.deadline,
          // Påmindelse er nu sin egen ting, som Lasse selv sætter i editoren
          // – ikke automatisk lig deadline.
          reminder_at: null,
          status: t.status,
          completed_at,
          category: t.category,
          tags,
          bucket: deriveBucket(t.deadline),
          priority: t.priority,
          position: Date.now(),
        });
      }
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from("tasks").insert(toInsert);
      if (error) return { source: "notion_tasks", ok: false, error: error.message };
    }

    await markSynced(supabase, userId, "notion");
    return { source: "notion_tasks", ok: true, count: toInsert.length + updated };
  } catch (e) {
    // queryNotionDatabase kaster nu en rigtig fejl, hvis selv første side af
    // en database ikke kunne læses (samme rettelse som Gmail/Outlook), så
    // den bliver fanget her i stedet for at blive fortolket som "0 opgaver".
    return { source: "notion_tasks", ok: false, error: e instanceof Error ? e.message : "Synk fejlede." };
  }
}
