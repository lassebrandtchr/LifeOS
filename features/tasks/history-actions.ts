"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Versionshistorik for opgaver – "gå tilbage til noget, jeg kom til at slette".
 *
 * Kopierne laves AUTOMATISK af en database-trigger (migration 0015): hver gang
 * en opgave ændres, gemmes den FORRIGE udgave i task_history.snapshot. Her
 * læser vi dem og kan sætte en gammel udgave tilbage.
 *
 * DEFENSIVT: er migration 0015 ikke kørt endnu, findes der bare ingen
 * versioner – så viser knappen "Ingen tidligere versioner", i stedet for at
 * fejle.
 */

/** Felter vi kan vise og gendanne. Matcher de felter editoren redigerer. */
export type TaskVersion = {
  id: string;
  created_at: string;
  title: string | null;
  notes: string | null;
  description: string | null;
  trade_in: string | null;
  priority: string | null;
  status: string | null;
  category: string | null;
  workspace: string | null;
  deadline: string | null;
  customer: Record<string, string> | null;
};

type Snapshot = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/** Hent tidligere udgaver af én opgave (nyeste først). */
export async function getTaskVersions(taskId: string): Promise<TaskVersion[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("task_history")
      .select("id, created_at, snapshot")
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .not("snapshot", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    const versions: TaskVersion[] = [];
    for (const row of data) {
      const s = (row.snapshot ?? {}) as Snapshot;
      versions.push({
        id: row.id as string,
        created_at: row.created_at as string,
        title: str(s.title),
        notes: str(s.notes),
        description: str(s.description),
        trade_in: str(s.trade_in),
        priority: str(s.priority),
        status: str(s.status),
        category: str(s.category),
        workspace: str(s.workspace),
        deadline: str(s.deadline),
        customer:
          s.customer && typeof s.customer === "object"
            ? (s.customer as Record<string, string>)
            : null,
      });
    }

    // Fjern kopier, der er indholdsmæssigt ens (auto-gem hvert 1,2 s under
    // skrivning laver mange næsten-identiske udgaver). Vi beholder den
    // NYESTE af hver unikke udgave, så listen er til at overskue.
    const seen = new Set<string>();
    return versions.filter((v) => {
      const key = JSON.stringify([
        v.title,
        v.notes,
        v.description,
        v.trade_in,
        v.priority,
        v.status,
        v.category,
        v.workspace,
        v.deadline,
        v.customer,
      ]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

/** Sæt en tidligere udgave tilbage på opgaven. */
export async function restoreTaskVersion(
  taskId: string,
  versionId: string,
): Promise<{ ok?: true; error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Databasen er ikke klar." };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Ikke logget ind." };

    const { data, error } = await supabase
      .from("task_history")
      .select("snapshot")
      .eq("id", versionId)
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data?.snapshot) return { error: "Kunne ikke finde udgaven." };
    const s = data.snapshot as Snapshot;

    // Sæt kun de felter tilbage, som brugeren selv redigerer. Vi rører ikke
    // id/user_id/created_at/position – og den NUVÆRENDE udgave gemmes
    // automatisk som en ny version af triggeren, så en gendannelse i sig selv
    // aldrig kan miste noget. Man kan altså også fortryde en gendannelse.
    const { error: upErr } = await supabase
      .from("tasks")
      .update({
        title: s.title ?? "",
        notes: s.notes ?? null,
        description: s.description ?? null,
        trade_in: s.trade_in ?? null,
        customer: s.customer ?? null,
        priority: s.priority ?? "can_wait",
        status: s.status ?? "not_started",
        category: s.category ?? null,
        workspace: s.workspace ?? "work",
        deadline: s.deadline ?? null,
      })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (upErr) return { error: upErr.message };

    revalidatePath("/");
    revalidatePath("/opgaver");
    revalidatePath("/storgaard-biler");
    revalidatePath("/privat");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}
