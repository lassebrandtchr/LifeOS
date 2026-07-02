"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Workspace } from "@/features/tasks/constants";

/**
 * Datalag for "Noter"-kasserne (config/note-cards.ts). Genbruger den
 * eksisterende `notes`-tabel (workspace + title + body) – titlen ER
 * nøglen, så der ikke skal en ny tabel/migration til for et lille,
 * fast sæt note-kasser.
 */

const NOT_READY = "Databasen er ikke klar endnu.";

async function getAuth() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/** Henter de gemte note-tekster for et sæt kendte titler (tom hvis endnu ikke skrevet). */
export async function getNoteCardBodies(
  workspace: Workspace,
  titles: string[],
): Promise<Record<string, string>> {
  const auth = await getAuth();
  if (!auth || titles.length === 0) return {};
  try {
    const { data } = await auth.supabase
      .from("notes")
      .select("title, body")
      .eq("user_id", auth.userId)
      .eq("workspace", workspace)
      .in("title", titles);

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.title) map[row.title] = row.body ?? "";
    }
    return map;
  } catch {
    return {};
  }
}

/** Gemmer (opretter/opdaterer) noten for én kasse. */
export async function saveNoteCard(
  title: string,
  workspace: Workspace,
  body: string,
): Promise<{ ok?: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  try {
    const { data: existing } = await auth.supabase
      .from("notes")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("workspace", workspace)
      .eq("title", title)
      .maybeSingle();

    if (existing) {
      const { error } = await auth.supabase
        .from("notes")
        .update({ body })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await auth.supabase.from("notes").insert({
        user_id: auth.userId,
        workspace,
        title,
        body,
        pinned: false,
      });
      if (error) return { error: error.message };
    }

    revalidatePath("/storgaard-biler");
    revalidatePath("/privat");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}
