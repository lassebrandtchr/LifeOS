"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * "Tekst med FED skrift" – notesblokken.
 *
 * Blev før kun gemt i browserens localStorage, som er privat pr. enhed. Derfor
 * var boksen tom på telefonen, selvom der stod tekst på computeren. Nu gemmes
 * teksten i databasen (én række pr. bruger), så den følger med på tværs af
 * enheder. localStorage bruges stadig som lokal kopi/offline-fallback.
 *
 * DEFENSIVT: er migration 0014 ikke kørt endnu, findes tabellen ikke. Så
 * returnerer/fejler vi stille, og komponenten kører videre på localStorage
 * præcis som før – i stedet for at vise fejl eller miste tekst.
 */

/**
 * Læs brugerens notesblok.
 *
 * Svaret skelner bevidst mellem TRE tilstande – ellers kan man ikke gemme og
 * rydde sikkert på tværs af enheder:
 *
 *   { ok: false }                 → kunne IKKE læse (offline, tabel mangler).
 *                                   Behold den lokale tekst. Skriv intet.
 *   { ok: true, content: null }   → ingen række endnu (aldrig gemt i skyen).
 *                                   Har enheden lokal tekst, løftes den op.
 *   { ok: true, content: "..." }  → skyen er sandheden (også når den er tom,
 *                                   fx fordi man har trykket "Ryd" et andet
 *                                   sted – så skal teksten IKKE genopstå).
 */
export type ScratchpadRead =
  | { ok: false }
  | { ok: true; content: string | null };

export async function getScratchpad(): Promise<ScratchpadRead> {
  if (!isSupabaseConfigured()) return { ok: false };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const { data, error } = await supabase
      .from("scratchpad")
      .select("content")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return { ok: false }; // fx tabellen findes ikke endnu
    // data === null → ingen række endnu (≠ en gemt, tom notesblok)
    return { ok: true, content: data ? (data.content ?? "") : null };
  } catch {
    return { ok: false };
  }
}

/** Gem brugerens notesblok. Stille fejl – teksten ligger stadig lokalt. */
export async function saveScratchpad(
  content: string,
): Promise<{ ok?: true; error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Ikke konfigureret." };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Ikke logget ind." };

    const { error } = await supabase.from("scratchpad").upsert(
      {
        user_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}
