"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getValidAccessToken } from "@/features/integrations/google";
import { createGoogleEvent } from "@/lib/google/calendar";
import type { Workspace } from "@/features/tasks/constants";

/**
 * Server Actions for kalenderen (Fase 9).
 *
 * Begivenheder oprettet i LifeOS gemmes med source='lifeos' og UDEN et Google-id
 * (external_id = null). Det markerer dem som "venter på at blive skubbet til
 * Google Kalender". Når de er synkroniseret derover, sættes external_id =
 * Google-event-id (så bliver de "synkroniseret"). Selve push'et til Google
 * kræver enten app-OAuth eller assistentens connector – det sker som et separat,
 * bevidst skridt. Vi ændrer aldrig noget hos Google herfra uden det.
 */

export type CalendarActionState =
  | { ok?: boolean; error?: string; syncedToGoogle?: boolean }
  | undefined;

const NOT_READY =
  "Databasen er ikke klar endnu. Kør migration 0004 i Supabase først.";

async function getAuth() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

export type NewEventInput = {
  title: string;
  /** ISO-streng (UTC) – beregnes i browseren ud fra Lasses lokale tid. */
  startsAt: string;
  endsAt: string;
  location?: string | null;
  workspace?: Workspace;
};

/** Opretter en begivenhed i LifeOS (klar til at blive synket til Google). */
export async function createCalendarEvent(
  input: NewEventInput,
): Promise<CalendarActionState> {
  const title = input.title?.trim();
  if (!title) return { error: "Begivenheden mangler en titel." };
  if (!input.startsAt || !input.endsAt)
    return { error: "Begivenheden mangler et tidspunkt." };

  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  try {
    const location = input.location?.trim() || null;
    const workspace = input.workspace ?? "private";

    const { data: inserted, error } = await auth.supabase
      .from("calendar_events")
      .insert({
        user_id: auth.userId,
        title,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        location,
        workspace,
        source: "lifeos",
        external_id: null, // venter på Google-synk
        all_day: false,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { error: "Kunne ikke gemme begivenheden. Prøv igen." };
    }

    // Hvis Google er forbundet: opret den OGSÅ på Google Kalender og gem id'et.
    // VIGTIGT: Google Kalender = PRIVAT. Arbejds-begivenheder (Storgaard) hører
    // til Outlook-kalenderen og må derfor ALDRIG skubbes til Google.
    let syncedToGoogle = false;
    const accessToken = workspace === "work" ? null : await getValidAccessToken();
    if (accessToken) {
      const ev = await createGoogleEvent(accessToken, {
        summary: title,
        startISO: input.startsAt,
        endISO: input.endsAt,
        location,
        description: "Oprettet via LifeOS 🗓️",
      });
      if (ev?.id) {
        syncedToGoogle = true;
        await auth.supabase
          .from("calendar_events")
          .update({ external_id: ev.id, source: "google_calendar" })
          .eq("id", inserted.id);
      }
    }

    revalidatePath("/kalender");
    revalidatePath("/");
    return { ok: true, syncedToGoogle };
  } catch {
    return { error: "Noget gik galt. Prøv igen." };
  }
}
