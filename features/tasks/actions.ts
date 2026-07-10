"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { searchAll, type TaskSearchStatus } from "@/features/tasks/queries";
import { parseTaskInput } from "@/features/tasks/parse";
import { deriveBucketFromDeadline as deriveBucket } from "@/features/tasks/bucket";
import type { Bucket, Priority, Status, Workspace } from "@/features/tasks/constants";
import type { Task } from "@/features/tasks/types";

/** Global søgning (kaldes fra topbarens søgefelt). */
export async function searchAction(query: string, taskStatus: TaskSearchStatus = "active") {
  return searchAll(query, taskStatus);
}

/**
 * Server Actions for opgave- & projektsystemet.
 * Alt kører på serveren. RLS sikrer, at man kun rører sine egne data.
 * Hver ændring logges i task_activity, og færdige opgaver gemmes i task_history.
 */

export type ActionState =
  | { ok?: boolean; error?: string; warning?: string; task?: Task }
  | undefined;

const NOT_READY =
  "Databasen er ikke klar endnu. Kør migration 0003 i Supabase først.";

/** Vises når backenden ikke svarer i tide – så knappen frigøres i stedet for at hænge. */
const BACKEND_TIMEOUT =
  "Kunne ikke gemme lige nu – tjek din forbindelse og prøv igen.";

async function getAuth() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/**
 * Kører `promise` i kapløb med en timeout – bruges til IKKE-kritiske
 * sideeffekter (aktivitetslog, historik). Et almindeligt try/catch
 * beskytter kun mod en smidt fejl, IKKE mod et kald der aldrig bliver
 * færdigt (fx et hængende Supabase-svar) – uden denne kunne et enkelt
 * langsomt "best effort"-kald blokere hele opgave-handlingen på ubestemt
 * tid (det var netop det, der fik "Markér som færdig" til at hænge på
 * "Gemmer …" for evigt).
 */
async function withTimeout(promise: PromiseLike<unknown>, ms = 5000): Promise<void> {
  try {
    await Promise.race([
      promise,
      new Promise((resolve) => setTimeout(resolve, ms)),
    ]);
  } catch {
    // best effort – fejler aldrig hårdt
  }
}

/** Sentinel: kapløbet blev vundet af timeouten, ikke af selve kaldet. */
const TIMED_OUT = Symbol("timed-out");

/**
 * Som withTimeout, men til KRITISKE kald hvor vi har brug for svaret (fx
 * selve opgave-opdateringen). Returnerer enten kaldets resultat eller
 * TIMED_OUT, hvis backenden ikke svarer i tide – så handlingen kan give en
 * venlig fejl i stedet for at hænge for evigt. Uden dette ville et langsomt/
 * utilgængeligt Supabase efterlade knappen fast på "Gemmer …" (React's
 * startTransition forbliver pending), og handlingen ville føles ignoreret.
 */
async function raceTimeout<T>(promise: PromiseLike<T>, ms = 12_000): Promise<T | typeof TIMED_OUT> {
  return Promise.race([
    promise,
    new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), ms)),
  ]);
}

/** Skriver en linje i aktivitetsloggen (best effort – fejler aldrig hårdt, og blokerer aldrig). */
async function logActivity(
  auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>,
  taskId: string | null,
  type: string,
  detail: Record<string, unknown>,
) {
  await withTimeout(
    auth.supabase.from("task_activity").insert({
      user_id: auth.userId,
      task_id: taskId,
      type,
      detail,
    }),
  );
}

// ───────────────────────────── Opret opgave ─────────────────────────────
export async function createTask(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const rawTitle = String(formData.get("title") ?? "").trim();
  if (!rawTitle) return { error: "Skriv en titel til opgaven." };

  // Smart-tilføj: forstå dansk dato/tid + kategori ud fra teksten.
  const parsed = parseTaskInput(rawTitle);

  // Manuelle valg vinder over parseren. "auto"/tom = lad parseren bestemme.
  const pick = (key: string) => {
    const v = formData.get(key);
    return v && v !== "auto" && v !== "" ? String(v) : null;
  };

  const title = parsed.title || rawTitle;
  const workspace =
    (pick("workspace") as Workspace) ?? parsed.workspace ?? "private";
  const priority =
    (pick("priority") as Priority) ?? parsed.priority ?? "can_wait";
  const category = pick("category") ?? parsed.categoryId;

  // Deadline: manuel dato (hvis valgt) ellers parserens udregnede tidspunkt.
  const manualDeadline = pick("deadline");
  const deadline = manualDeadline
    ? new Date(manualDeadline).toISOString()
    : (parsed.deadline?.toISOString() ?? null);

  // Bucket: manuel ellers udledt af deadline.
  const bucket =
    (pick("bucket") as Bucket) ?? deriveBucket(parsed.deadline);

  const description = (formData.get("description") as string) || null;

  try {
    const { data, error } = await auth.supabase
      .from("tasks")
      .insert({
        user_id: auth.userId,
        title,
        description,
        workspace,
        bucket,
        priority,
        category,
        deadline,
        // Påmindelse er sin egen ting (sættes i editoren), ikke automatisk lig deadline.
        reminder_at: null,
        status: "not_started",
        position: Date.now(),
      })
      .select("*")
      .single();

    if (error) return { error: error.message };
    await logActivity(auth, data.id, "created", { title });
    revalidatePath("/opgaver");
    revalidatePath("/");
    revalidatePath("/storgaard-biler");
    revalidatePath("/privat");
    revalidatePath("/markedsfoering");
    return { ok: true, task: data as Task };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

/**
 * Lyn-opret en opgave fra en "Hurtig handling"-knap og returnér den fulde
 * opgave, så UI'et bagefter kan åbne editoren (detalje-visningen) for den
 * nye opgave DIREKTE på siden – uden at navigere væk.
 */
export async function quickCreateTask(params: {
  title: string;
  workspace?: Workspace;
  priority?: Priority;
  category?: string | null;
  note?: string | null;
  bucket?: Bucket;
  status?: Status;
}): Promise<{ ok?: boolean; task?: Task; error?: string }> {
  const title = params.title.trim();
  if (!title) return { error: "Opgaven mangler en titel." };

  try {
    // getAuth() er inde i try, så et hængende/fejlende auth-kald returnerer en
    // pæn fejl i stedet for at kaste (og efterlade UI'ets pending-lås hængende).
    const auth = await getAuth();
    if (!auth) return { error: NOT_READY };

    const { data, error } = await auth.supabase
      .from("tasks")
      .insert({
        user_id: auth.userId,
        title,
        workspace: params.workspace ?? "work",
        bucket: params.bucket ?? "today",
        priority: params.priority ?? "can_wait",
        category: params.category ?? null,
        notes: params.note ?? null,
        status: params.status ?? "not_started",
        position: Date.now(),
      })
      .select("*")
      .single();

    if (error) return { error: error.message };
    await logActivity(auth, data.id, "created", { title });
    revalidatePath("/opgaver");
    revalidatePath("/");
    revalidatePath("/storgaard-biler");
    revalidatePath("/privat");
    return { ok: true, task: data as Task };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

// ──────────────────────── Flyt opgave (drag & drop) ─────────────────────
export async function moveTask(id: string, bucket: Bucket, position: number) {
  const auth = await getAuth();
  if (!auth) return;
  try {
    await auth.supabase
      .from("tasks")
      .update({ bucket, position })
      .eq("id", id);
    await logActivity(auth, id, "moved", { bucket });
    revalidatePath("/opgaver");
  } catch {
    // ignoreres – UI viser allerede optimistisk flytning
  }
}

// ───────────────────────────── Skift status ─────────────────────────────
export async function setTaskStatus(id: string, status: Status) {
  const auth = await getAuth();
  if (!auth) return;
  const isDone = status === "done";
  try {
    const { data } = await auth.supabase
      .from("tasks")
      .update({ status, completed_at: isDone ? new Date().toISOString() : null })
      .eq("id", id)
      .select("title")
      .single();

    if (isDone && data) {
      await withTimeout(
        auth.supabase.from("task_history").insert({
          user_id: auth.userId,
          task_id: id,
          title: data.title,
          action: "completed",
        }),
      );
    }
    await logActivity(
      auth,
      id,
      status === "done" ? "completed" : status === "archived" ? "archived" : "edited",
      { status },
    );
    revalidatePath("/opgaver");
    revalidatePath("/storgaard-biler");
    revalidatePath("/privat");
  } catch {
    // ignoreres
  }
}

// ─────────────────────────────── Slet opgave ────────────────────────────
export async function deleteTask(id: string) {
  const auth = await getAuth();
  if (!auth) return;
  try {
    await auth.supabase.from("tasks").delete().eq("id", id);
    revalidatePath("/opgaver");
  } catch {
    // ignoreres
  }
}

// ──────────────────── Opret note (Second Brain) ─────────────────────────
export async function createNote(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Skriv lidt indhold til noten." };

  const title = (formData.get("title") as string)?.trim() || null;
  const workspace = (formData.get("workspace") as Workspace) || "private";

  try {
    const { error } = await auth.supabase.from("notes").insert({
      user_id: auth.userId,
      title,
      body,
      workspace,
      pinned: false,
    });
    if (error) return { error: error.message };
    revalidatePath("/opgaver");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

/** Fastgør / frigør en note. */
export async function toggleNotePinned(id: string, pinned: boolean) {
  const auth = await getAuth();
  if (!auth) return;
  try {
    await auth.supabase.from("notes").update({ pinned }).eq("id", id);
    revalidatePath("/opgaver");
  } catch {
    // ignoreres
  }
}

export async function deleteNote(id: string) {
  const auth = await getAuth();
  if (!auth) return;
  try {
    await auth.supabase.from("notes").delete().eq("id", id);
    revalidatePath("/opgaver");
  } catch {
    // ignoreres
  }
}

// ───────────────────────────── Opret projekt ────────────────────────────
export async function createProject(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Skriv et navn til projektet." };

  const workspace = (formData.get("workspace") as Workspace) || "private";
  const description = (formData.get("description") as string) || null;
  const deadline = (formData.get("deadline") as string) || null;

  try {
    const { error } = await auth.supabase.from("projects").insert({
      user_id: auth.userId,
      name,
      description,
      workspace,
      status: "active",
      deadline: deadline || null,
    });
    if (error) return { error: error.message };
    revalidatePath("/opgaver");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

/**
 * Opdaterer ALLE redigerbare felter på en opgave (fra den fulde editor).
 * Tomme/uændrede felter kan sendes med – vi sætter kun det, der gives.
 */
export async function updateTask(
  id: string,
  fields: {
    title?: string;
    description?: string | null;
    workspace?: Workspace;
    priority?: Priority;
    status?: Status;
    bucket?: Bucket;
    category?: string | null;
    deadline?: string | null; // ISO eller null
    reminder_at?: string | null; // ISO eller null – uafhængig af deadline
    notes?: string | null;
    trade_in?: string | null;
  },
): Promise<ActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };

  const update: Record<string, unknown> = {};
  if (fields.title !== undefined) {
    const t = fields.title.trim();
    if (!t) return { error: "Opgaven skal have et emne." };
    update.title = t;
  }
  if (fields.description !== undefined)
    update.description = fields.description?.trim() || null;
  if (fields.workspace !== undefined) update.workspace = fields.workspace;
  if (fields.priority !== undefined) update.priority = fields.priority;
  if (fields.bucket !== undefined) update.bucket = fields.bucket;
  if (fields.category !== undefined) update.category = fields.category || null;
  if (fields.notes !== undefined) update.notes = fields.notes?.trim() || null;
  if (fields.trade_in !== undefined) update.trade_in = fields.trade_in?.trim() || null;
  if (fields.deadline !== undefined) update.deadline = fields.deadline || null;
  if (fields.reminder_at !== undefined) update.reminder_at = fields.reminder_at || null;
  if (fields.status !== undefined) {
    update.status = fields.status;
    update.completed_at =
      fields.status === "done" ? new Date().toISOString() : null;
  }

  try {
    // Selve opdateringen kappes med en timeout: hvis Supabase ikke svarer,
    // returnerer vi en venlig fejl i stedet for at lade kaldet hænge – ellers
    // ville modalens "Gem"/"Markér som færdig"-knap sidde fast på "Gemmer …".
    const first = await raceTimeout(
      auth.supabase
        .from("tasks")
        .update(update)
        .eq("id", id)
        .eq("user_id", auth.userId),
    );
    if (first === TIMED_OUT) return { error: BACKEND_TIMEOUT };
    let { error } = first;

    // Migration 0011 (kolonnen "trade_in") er måske ikke kørt i Supabase
    // endnu – lad ikke det blokere resten af opgaven (titel/deadline/status
    // osv.) fra at blive gemt. Prøv igen uden feltet, og fortæl hvorfor.
    // Postgres selv fejler med "42703"; PostgREST's skema-cache (langt
    // hyppigere set i praksis) fejler i stedet med koden "PGRST204" og en
    // besked som "Could not find the 'trade_in' column ... in the schema
    // cache" – begge skal fange faldet tilbage til retry.
    const missingTradeIn =
      "trade_in" in update &&
      (error?.code === "42703" ||
        error?.code === "PGRST204" ||
        /trade_in/i.test(error?.message ?? ""));
    if (missingTradeIn) {
      delete update.trade_in;
      const retry = await raceTimeout(
        auth.supabase
          .from("tasks")
          .update(update)
          .eq("id", id)
          .eq("user_id", auth.userId),
      );
      if (retry === TIMED_OUT) return { error: BACKEND_TIMEOUT };
      error = retry.error;
      if (!error) {
        return {
          ok: true,
          warning: "Byttebil blev ikke gemt – kør migration 0011 i Supabase.",
        };
      }
    }
    if (error) return { error: error.message };

    if (fields.status === "done") {
      await withTimeout(
        auth.supabase.from("task_history").insert({
          user_id: auth.userId,
          task_id: id,
          title: (update.title as string) ?? undefined,
          action: "completed",
        }),
      );
    }
    await logActivity(auth, id, "edited", {
      title: update.title as string | undefined,
    });
    revalidatePath("/opgaver");
    revalidatePath("/");
    revalidatePath("/storgaard-biler");
    revalidatePath("/privat");
    revalidatePath("/markedsfoering");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

/** Gemmer noten på en opgave (notes-feltet findes allerede). */
export async function updateTaskNotes(
  id: string,
  notes: string,
): Promise<ActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };
  try {
    const { error } = await auth.supabase
      .from("tasks")
      .update({ notes: notes.trim() || null })
      .eq("id", id)
      .eq("user_id", auth.userId);
    if (error) return { error: error.message };
    revalidatePath("/opgaver");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

/**
 * Opgaver med en "Påmind mig"-tid, der er nået (eller overskredet), og som
 * ikke er markeret færdige – bruges af ReminderWatcher til at vise den
 * globale, pulserende pop op-notifikation uanset hvilken side man er på.
 * Fuld Task-række (ikke kun et par felter), så klik kan åbne editoren
 * direkte via useOpenDetail() uden en ekstra tur til serveren.
 */
export async function getDueReminders(): Promise<Task[]> {
  const auth = await getAuth();
  if (!auth) return [];
  try {
    const { data } = await auth.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", auth.userId)
      .not("reminder_at", "is", null)
      .neq("status", "done")
      .lte("reminder_at", new Date().toISOString());
    return (data ?? []) as Task[];
  } catch {
    return [];
  }
}

/** Gemmer noten på et projekt. */
export async function updateProjectNotes(
  id: string,
  notes: string,
): Promise<ActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };
  try {
    const { error } = await auth.supabase
      .from("projects")
      .update({ notes: notes.trim() || null })
      .eq("id", id)
      .eq("user_id", auth.userId);
    if (error) return { error: error.message };
    revalidatePath("/opgaver");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}
