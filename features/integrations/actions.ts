"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { connectorById } from "@/features/integrations/registry";

/**
 * Server Actions for Integration Center (Fase 9).
 *
 * Her tænder/slukker Lasse de enkelte connectors. Alt kører på serveren, og RLS
 * sikrer, at man kun rører sin egen tilstand.
 *
 * VIGTIGT: at tænde en connector betyder "jeg vil gerne forbinde denne" – selve
 * data-synken (at hente rigtige mails/events ind) sker som et separat, bevidst
 * skridt senere. Vi ændrer aldrig noget hos udbyderen herfra.
 */

export type IntegrationActionState =
  | { ok?: boolean; error?: string; message?: string; warning?: string }
  | undefined;

const NOT_READY =
  "Databasen er ikke klar endnu. Kør migration 0004 i Supabase først.";

async function getAuth() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  // auth.getUser() går over netværket og havde ingen timeout – er databasen
  // langsom (gratis-plan, netop vågnet), kunne en synk-handling hænge her
  // uden nogensinde at svare, så knappen stod tavs. Kap kaldet, så handlingen
  // ALTID svarer (klienten viser så en venlig fejl i stedet for ingenting).
  const res = await Promise.race([
    supabase.auth.getUser(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);
  const user = res?.data?.user;
  if (!user) return null;
  return { supabase, userId: user.id };
}

/**
 * Udleder en prioritet ud fra deadline, når teksten ikke selv afslører den.
 * Så slipper vi for at ALT lander som "kan vente": noget med en nær frist
 * bliver vigtigt/haster af sig selv.
 */
function derivePriority(deadlineISO: string | null, status: string): string {
  if (status === "done" || status === "archived") return "can_wait";
  if (!deadlineISO) return "can_wait";
  const deadline = new Date(deadlineISO).getTime();
  if (Number.isNaN(deadline)) return "can_wait";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((deadline - startOfToday.getTime()) / 86_400_000);
  if (diffDays <= 0) return "urgent"; // forfalden eller i dag
  if (diffDays <= 2) return "important"; // inden for 2 dage
  return "can_wait"; // denne uge og langt ude i fremtiden
}

/**
 * Tænd/sluk en connector. Når den tændes, markeres den som 'connected' (klar);
 * når den slukkes, sættes status tilbage til 'disconnected'.
 */
export async function setConnectorEnabled(
  connectorId: string,
  enabled: boolean,
): Promise<IntegrationActionState> {
  const def = connectorById(connectorId);
  if (!def) return { error: "Ukendt integration." };
  if (def.comingSoon) {
    return { error: `${def.name} kan ikke forbindes endnu – kommer snart.` };
  }

  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  try {
    const { error } = await auth.supabase.from("integrations").upsert(
      {
        user_id: auth.userId,
        connector_id: connectorId,
        enabled,
        status: enabled ? "connected" : "disconnected",
      },
      { onConflict: "user_id,connector_id" },
    );

    if (error) return { error: "Kunne ikke gemme ændringen. Prøv igen." };

    revalidatePath("/indstillinger");
    return { ok: true };
  } catch {
    return { error: "Noget gik galt. Prøv igen." };
  }
}

/** Afbryd Google-forbindelsen (slet tokens + markér connectors afbrudt). */
export async function disconnectGoogle(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };
  try {
    await auth.supabase
      .from("google_connections")
      .delete()
      .eq("user_id", auth.userId);
    await auth.supabase
      .from("integrations")
      .update({ enabled: false, status: "disconnected" })
      .eq("user_id", auth.userId)
      .in("connector_id", ["gmail", "google_calendar"]);
    revalidatePath("/indstillinger");
    revalidatePath("/kalender");
    return { ok: true };
  } catch {
    return { error: "Kunne ikke afbryde. Prøv igen." };
  }
}

/**
 * Henter kommende begivenheder fra Google ind i LifeOS (kalender-pull).
 * Kræver en aktiv Google-forbindelse.
 */
export async function syncGoogleCalendar(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const { getValidAccessToken } = await import("@/features/integrations/google");
  const { listCalendars, listEventsFromCalendar, probeCalendarApi } = await import(
    "@/lib/google/calendar"
  );
  const { parseTaskInput } = await import("@/features/tasks/parse");

  const token = await getValidAccessToken();
  if (!token) return { error: "Google er ikke forbundet endnu." };

  try {
    const now = new Date();
    const from = new Date(now.getTime() - 14 * 86_400_000).toISOString();
    const to = new Date(now.getTime() + 120 * 86_400_000).toISOString();

    // Hent listen over ALLE kalendere (primær + delte som "Hanne og Lasse").
    const calendars = await listCalendars(token);
    if (calendars.length === 0) {
      // Find ud af HVORFOR (samme mønster som Gmail): er Google Calendar API
      // slået fra i Cloud-projektet, eller mangler der adgang?
      const probe = await probeCalendarApi(token);
      const reason = (probe.reason ?? "").toLowerCase();
      if (reason.includes("disabled") || reason.includes("has not been used")) {
        return {
          error:
            "Google Kalender er ikke slået til i din Google Cloud-konto. Åbn Google Cloud Console → APIs & Services → Enable APIs → søg 'Google Calendar API' → Enable. Prøv så igen om et øjeblik.",
        };
      }
      if (
        reason.includes("insufficient") ||
        reason.includes("scope") ||
        reason.includes("permission") ||
        probe.status === 403
      ) {
        return {
          error:
            "LifeOS mangler adgang til din Google Kalender (tilladelsen blev ikke givet ved login). Gå til Indstillinger → Google Kalender → Afbryd → Forbind igen, og sæt flueben ved BÅDE Kalender og Gmail.",
        };
      }
      return {
        error:
          "Kunne ikke læse dine kalendere. Gå til Indstillinger → Google Kalender → Afbryd, og Forbind så igen for at give adgang til ALLE dine kalendere.",
      };
    }

    // Hent events fra hver kalender og saml dem (dedup på event-id).
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
          user_id: auth.userId,
          source: "google_calendar",
          external_id: e.id,
          title: e.summary,
          description: e.description,
          location: e.location,
          starts_at: e.startISO,
          ends_at: e.endISO,
          all_day: e.allDay,
          // Verden ud fra titlen: kendte arbejds-/private navne + nøgleord
          // (fx "Storgaard", bilmærker) vinder; ellers privat som standard.
          workspace: parseTaskInput(e.summary).workspace ?? "private",
        });
      }
    }

    // SIKKERHEDSLÅS: ryd kun + genindsæt, hvis vi rent faktisk hentede noget.
    if (rows.length === 0) {
      return { error: "Hentede ingen aftaler fra Google – intet blev ændret." };
    }
    await auth.supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", auth.userId)
      .eq("source", "google_calendar")
      .gte("starts_at", from)
      .lte("starts_at", to);
    await auth.supabase.from("calendar_events").insert(rows);

    await auth.supabase
      .from("integrations")
      .update({ status: "connected", last_synced_at: new Date().toISOString() })
      .eq("user_id", auth.userId)
      .eq("connector_id", "google_calendar");

    revalidatePath("/kalender");
    revalidatePath("/indstillinger");
    return {
      ok: true,
      message: `Hentede ${rows.length} aftaler fra ${calendars.length} kalendere.`,
    };
  } catch {
    return { error: "Synkronisering fejlede. Prøv igen." };
  }
}

/** Handlingsanvisning ved manglende Gmail-adgang – bruges begge steder nedenfor. */
const GMAIL_RECONNECT =
  "LifeOS har ikke adgang til din Gmail. Gå til Indstillinger → Gmail → Afbryd, " +
  "og Forbind så igen. VIGTIGT: sæt flueben ved BÅDE Gmail og Kalender på " +
  "Googles tilladelses-skærm (fjern ikke fluebenet ved Gmail).";

const GMAIL_API_DISABLED =
  "Gmail er ikke slået til i din Google Cloud-konto. Åbn Google Cloud Console → " +
  "APIs & Services → Enable APIs → søg 'Gmail API' → Enable. Prøv så igen om et " +
  "øjeblik.";

/** Henter de seneste Gmail-mails ind i LifeOS (mail-pull). */
export async function syncGmail(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const { getValidAccessToken, hasGmailScope } = await import(
    "@/features/integrations/google"
  );
  const { syncGmailCore } = await import("@/features/integrations/sync-core");
  const { GmailApiError } = await import("@/lib/google/gmail");

  const token = await getValidAccessToken();
  if (!token) return { error: "Google er ikke forbundet endnu." };

  // Blev Gmail-adgang overhovedet givet? Fanger den hyppigste 403-årsag FØR
  // vi kalder Gmail – med en klar besked i stedet for en teknisk fejlkode.
  if (!(await hasGmailScope())) {
    return { error: GMAIL_RECONNECT };
  }

  const res = await syncGmailCore(auth.supabase, auth.userId, token);
  if (!res.ok) {
    // Oversæt de to 403-årsager til hver sin handlingsanvisning. syncGmailCore
    // videregiver GmailApiError'ens besked (og reason via error), så vi kan
    // skelne "manglende scope" fra "API'et er slået fra".
    const reason = (res.error ?? "").toLowerCase();
    if (reason.includes("scope") || reason.includes("permission")) {
      return { error: GMAIL_RECONNECT };
    }
    if (reason.includes("disabled") || reason.includes("has not been used")) {
      return { error: GMAIL_API_DISABLED };
    }
    return { error: res.error ?? "Synkronisering fejlede." };
  }

  revalidatePath("/mail");
  revalidatePath("/privat");
  revalidatePath("/");
  revalidatePath("/indstillinger");
  return { ok: true, message: `Hentede ${res.count ?? 0} mails fra Gmail.` };
}

/**
 * Henter Outlook-mail OG Outlook-kalender ind i LifeOS (Microsoft Graph).
 * Storgaard Biler = Outlook = arbejde.
 */
export async function syncMicrosoft(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const { getValidMicrosoftToken } = await import("@/features/integrations/microsoft");
  const { syncOutlookMailCore, syncOutlookCalendarCore } = await import(
    "@/features/integrations/sync-core"
  );

  const token = await getValidMicrosoftToken();
  if (!token) return { error: "Outlook er ikke forbundet endnu." };

  const mail = await syncOutlookMailCore(auth.supabase, auth.userId, token);
  const cal = await syncOutlookCalendarCore(auth.supabase, auth.userId, token);
  if (!mail.ok && !cal.ok) return { error: "Synkronisering fejlede." };

  revalidatePath("/mail");
  revalidatePath("/kalender");
  revalidatePath("/storgaard-biler");
  revalidatePath("/");
  revalidatePath("/indstillinger");
  return {
    ok: true,
    message: `Hentede ${mail.count ?? 0} mails og ${cal.count ?? 0} aftaler fra Outlook.`,
  };
}

/** Afbryd Outlook-forbindelsen (slet tokens + markér connectors afbrudt). */
export async function disconnectMicrosoft(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };
  try {
    await auth.supabase
      .from("microsoft_connections")
      .delete()
      .eq("user_id", auth.userId);
    await auth.supabase
      .from("integrations")
      .update({ enabled: false, status: "disconnected" })
      .eq("user_id", auth.userId)
      .in("connector_id", ["outlook_mail", "outlook_calendar"]);
    revalidatePath("/indstillinger");
    revalidatePath("/mail");
    revalidatePath("/kalender");
    return { ok: true };
  } catch {
    return { error: "Kunne ikke afbryde. Prøv igen." };
  }
}

/**
 * Synk ALT, brugeren har forbundet, lige nu (samme kerne som det automatiske
 * cron-job – bruges af "Synk alt nu"-knappen).
 */
export async function syncEverythingNow(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const { getValidAccessToken } = await import("@/features/integrations/google");
  const { getValidMicrosoftToken } = await import("@/features/integrations/microsoft");
  const { getNotionToken } = await import("@/features/integrations/notion");
  const {
    syncGmailCore,
    syncGoogleCalendarCore,
    syncOutlookMailCore,
    syncOutlookCalendarCore,
    syncNotionTasksCore,
    syncNotionPagesCore,
  } = await import("@/features/integrations/sync-core");

  let ran = 0;
  // Kald blev tidligere ikke tjekket for fejl her – et fejlet Gmail-kald
  // (fx udløbet token) blev stille slugt, og "Synk nu" sagde ALTID "Alt er
  // synkroniseret", selvom det reelt ikke var sandt. Nu samles fejl op og
  // vises som en advarsel, mens de kilder der RENT FAKTISK lykkedes stadig
  // regnes for en succes.
  const failures: string[] = [];

  const googleToken = await getValidAccessToken();
  if (googleToken) {
    const gmail = await syncGmailCore(auth.supabase, auth.userId, googleToken);
    if (!gmail.ok) failures.push(`Gmail (${gmail.error ?? "ukendt fejl"})`);
    const googleCal = await syncGoogleCalendarCore(auth.supabase, auth.userId, googleToken);
    if (!googleCal.ok) failures.push(`Google Kalender (${googleCal.error ?? "ukendt fejl"})`);
    ran++;
  }

  const msToken = await getValidMicrosoftToken();
  if (msToken) {
    const outlookMail = await syncOutlookMailCore(auth.supabase, auth.userId, msToken);
    if (!outlookMail.ok) failures.push(`Outlook mail (${outlookMail.error ?? "ukendt fejl"})`);
    const outlookCal = await syncOutlookCalendarCore(auth.supabase, auth.userId, msToken);
    if (!outlookCal.ok) failures.push(`Outlook kalender (${outlookCal.error ?? "ukendt fejl"})`);
    ran++;
  }

  const notionToken = await getNotionToken();
  if (notionToken) {
    const notionTasks = await syncNotionTasksCore(auth.supabase, auth.userId, notionToken);
    if (!notionTasks.ok) failures.push(`Notion opgaver (${notionTasks.error ?? "ukendt fejl"})`);
    const notionPages = await syncNotionPagesCore(auth.supabase, auth.userId, notionToken);
    if (!notionPages.ok) failures.push(`Notion sider (${notionPages.error ?? "ukendt fejl"})`);
    ran++;
  }

  if (ran === 0) return { error: "Ingen forbindelser at synke endnu." };

  for (const p of ["/", "/mail", "/kalender", "/opgaver", "/storgaard-biler", "/privat", "/markedsfoering", "/indstillinger"]) {
    revalidatePath(p);
  }

  if (failures.length > 0) {
    return { ok: true, message: "Synk delvist gennemført.", warning: failures.join(" · ") };
  }
  return { ok: true, message: "Alt er synkroniseret." };
}

/** Forbind Notion med en intern integration-token (valideres mod Notion). */
export async function connectNotion(
  rawToken: string,
): Promise<IntegrationActionState> {
  const token = rawToken.trim();
  if (!token) return { error: "Indsæt din Notion-nøgle." };

  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const { verifyNotionToken } = await import("@/lib/notion/client");
  const check = await verifyNotionToken(token);
  if (!check.ok) {
    return { error: "Nøglen virker ikke. Tjek at du kopierede hele 'Internal Integration Secret'." };
  }

  try {
    await auth.supabase.from("notion_connections").upsert(
      { user_id: auth.userId, token, workspace_name: check.name },
      { onConflict: "user_id" },
    );
    await auth.supabase.from("integrations").upsert(
      {
        user_id: auth.userId,
        connector_id: "notion",
        enabled: true,
        status: "connected",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connector_id" },
    );
    revalidatePath("/indstillinger");
    return { ok: true };
  } catch {
    return { error: "Kunne ikke gemme forbindelsen. Prøv igen." };
  }
}

/** Afbryd Notion (slet token + markér afbrudt). */
export async function disconnectNotion(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };
  try {
    await auth.supabase
      .from("notion_connections")
      .delete()
      .eq("user_id", auth.userId);
    await auth.supabase
      .from("integrations")
      .update({ enabled: false, status: "disconnected" })
      .eq("user_id", auth.userId)
      .eq("connector_id", "notion");
    revalidatePath("/indstillinger");
    return { ok: true };
  } catch {
    return { error: "Kunne ikke afbryde. Prøv igen." };
  }
}

/**
 * Henter opgaver fra Notion-databaserne ("To-do-kalender" → Storgaard,
 * "Personligt Dashboard" → Privat) og lægger dem ind som rigtige LifeOS-opgaver.
 *
 * Sikker dedup: opgaver matches på notion_id. Eksisterende opdateres, nye
 * indsættes. Manuelt oprettede opgaver (uden notion_id) røres ALDRIG.
 */
export async function syncNotionTasks(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const { getNotionToken } = await import("@/features/integrations/notion");
  const { listNotionDatabases, queryNotionDatabase } = await import(
    "@/lib/notion/client"
  );
  const { mapRowToTask, deriveBucket, workspaceForDatabase } = await import(
    "@/features/integrations/notion-tasks"
  );
  const { parseTaskInput } = await import("@/features/tasks/parse");

  const token = await getNotionToken();
  if (!token) return { error: "Notion er ikke forbundet endnu." };

  try {
    // 1) Find de databaser, integrationen kan se, og behold dem vi kender.
    const databases = await listNotionDatabases(token);
    const relevant = databases
      .map((db) => ({ ...db, workspace: workspaceForDatabase(db.title) }))
      .filter((db): db is typeof db & { workspace: "work" | "private" } =>
        db.workspace !== null,
      );

    if (relevant.length === 0) {
      return {
        error:
          "Fandt ingen kendte Notion-databaser. Husk at dele 'To-do-kalender' og 'Personligt Dashboard' med din integration inde i Notion (••• → Forbindelser).",
      };
    }

    // 2) Hent rækker fra hver database og map til opgaver.
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

        // Kør den danske parser på titlen, så vi forstår opgaven bedre:
        //  • verden: en privat opgave i "To-do-kalender" genkendes som privat
        //    (parseren vinder over databasens standard-verden).
        //  • kategori: Notions "Arbejdsområde" vinder; ellers parserens gæt.
        //  • prioritet: udledes af nøgleord/deadline (ikke altid "kan vente").
        const parsed = parseTaskInput(t.title);
        const workspace = parsed.workspace ?? db.workspace;
        const category = t.category ?? parsed.categoryId;
        const priority =
          parsed.priority ?? derivePriority(t.deadline, t.status);

        mapped.push({ ...t, workspace, category, priority });
      }
    }

    if (mapped.length === 0) {
      return { error: "Fandt ingen opgaver i Notion-databaserne." };
    }

    // 3) Slå allerede-importerede Notion-opgaver op (dedup på notion_id).
    const { data: existing } = await auth.supabase
      .from("tasks")
      .select("id, notion_id, status")
      .eq("user_id", auth.userId)
      .not("notion_id", "is", null);

    const byNotionId = new Map<string, { id: string; status: string }>();
    for (const r of existing ?? []) {
      if (r.notion_id) byNotionId.set(r.notion_id as string, { id: r.id as string, status: r.status as string });
    }

    // 4) Del op i nye (insert) og kendte (update).
    const toInsert: Record<string, unknown>[] = [];
    let updated = 0;
    for (const t of mapped) {
      const completed_at = t.done || t.status === "done" ? new Date().toISOString() : null;
      const tags = t.workArea ? [t.workArea] : [];
      const local = byNotionId.get(t.notionId);

      if (local) {
        // Opdatér kun det Notion ejer – bevarer Lasses bucket/position/noter.
        const update: Record<string, unknown> = {
          title: t.title,
          deadline: t.deadline,
          category: t.category,
          workspace: t.workspace,
          priority: t.priority,
        };
        // Samme regel som syncNotionTasksCore: en Notion-side der stadig
        // står som åben må ALDRIG genåbne en opgave, der allerede er
        // markeret færdig her i appen (synkroniseringen er kun én vej).
        if (local.status !== "done") {
          update.status = t.status;
          update.completed_at = completed_at;
        }
        await auth.supabase
          .from("tasks")
          .update(update)
          .eq("id", local.id)
          .eq("user_id", auth.userId);
        updated++;
      } else {
        toInsert.push({
          user_id: auth.userId,
          title: t.title,
          workspace: t.workspace,
          source: "notion",
          notion_id: t.notionId,
          deadline: t.deadline,
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
      const { error } = await auth.supabase.from("tasks").insert(toInsert);
      if (error) return { error: error.message };
    }

    await auth.supabase
      .from("integrations")
      .update({ status: "connected", last_synced_at: new Date().toISOString() })
      .eq("user_id", auth.userId)
      .eq("connector_id", "notion");

    revalidatePath("/opgaver");
    revalidatePath("/storgaard-biler");
    revalidatePath("/privat");
    revalidatePath("/");
    revalidatePath("/indstillinger");

    return {
      ok: true,
      message: `Importerede ${toInsert.length} nye og opdaterede ${updated} opgaver fra Notion.`,
    };
  } catch {
    return { error: "Kunne ikke hente opgaver fra Notion. Prøv igen." };
  }
}

/** Henter sider/databaser fra Notion ind i LifeOS (delete + insert = fuld genopfriskning). */
export async function syncNotion(): Promise<IntegrationActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const { getNotionToken } = await import("@/features/integrations/notion");
  const { searchNotion } = await import("@/lib/notion/client");

  const token = await getNotionToken();
  if (!token) return { error: "Notion er ikke forbundet endnu." };

  try {
    const pages = await searchNotion(token, 50);

    // Erstat brugerens Notion-emner (delete + insert; notion_items har kun et
    // partielt unikt indeks som PostgREST ikke kan upserte på).
    await auth.supabase
      .from("notion_items")
      .delete()
      .eq("user_id", auth.userId);

    if (pages.length > 0) {
      const rows = pages.map((p) => ({
        user_id: auth.userId,
        external_id: p.id,
        title: p.title,
        type: p.type,
        url: p.url,
        snippet: p.snippet,
        edited_at: p.editedISO,
        workspace: "work",
      }));
      await auth.supabase.from("notion_items").insert(rows);
    }

    await auth.supabase
      .from("integrations")
      .update({ status: "connected", last_synced_at: new Date().toISOString() })
      .eq("user_id", auth.userId)
      .eq("connector_id", "notion");

    revalidatePath("/indstillinger");
    return { ok: true };
  } catch {
    return { error: "Synkronisering fejlede. Prøv igen." };
  }
}
