"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ChecklistItem } from "@/features/marketing/types";

/**
 * Server Actions for Marketing Workspace (Fase 10).
 * Alt kører på serveren; RLS sikrer, at man kun rører sine egne data.
 * REGELBASERET – ingen AI involveret.
 */

export type MarketingActionState = {
  ok?: boolean;
  id?: string;
  error?: string;
};

const NOT_READY =
  "Databasen er ikke klar endnu. Kør migration 0009 i Supabase først.";

async function getAuth() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

function revalidate() {
  revalidatePath("/markedsfoering");
  revalidatePath("/storgaard-biler");
  revalidatePath("/");
}

/** Generisk insert der returnerer id'et. */
async function insertRow(
  table: string,
  values: Record<string, unknown>,
): Promise<MarketingActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };
  try {
    const { data, error } = await auth.supabase
      .from(table)
      .insert({ ...values, user_id: auth.userId })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidate();
    return { ok: true, id: data.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

async function updateRow(
  table: string,
  id: string,
  values: Record<string, unknown>,
): Promise<MarketingActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };
  try {
    const { error } = await auth.supabase
      .from(table)
      .update(values)
      .eq("id", id)
      .eq("user_id", auth.userId);
    if (error) return { error: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

async function deleteRow(table: string, id: string): Promise<MarketingActionState> {
  const auth = await getAuth();
  if (!auth) return { error: NOT_READY };
  try {
    await auth.supabase.from(table).delete().eq("id", id).eq("user_id", auth.userId);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ukendt fejl." };
  }
}

// ─────────────────────────────── Kampagner ──────────────────────────
export async function createCampaign(input: {
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  platforms?: string[];
  notes?: string;
}): Promise<MarketingActionState> {
  if (!input.name?.trim()) return { error: "Kampagnen mangler et navn." };
  return insertRow("marketing_campaigns", {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    status: input.status ?? "planned",
    platforms: input.platforms ?? [],
    notes: input.notes?.trim() || null,
  });
}

export async function updateCampaign(id: string, values: Record<string, unknown>) {
  return updateRow("marketing_campaigns", id, values);
}
export async function deleteCampaign(id: string) {
  return deleteRow("marketing_campaigns", id);
}

// ─────────────────────────────── Idébank ────────────────────────────
export async function createIdea(input: {
  title: string;
  body?: string;
  kind?: string;
  tags?: string[];
}): Promise<MarketingActionState> {
  if (!input.title?.trim()) return { error: "Idéen mangler en titel." };
  return insertRow("marketing_ideas", {
    title: input.title.trim(),
    body: input.body?.trim() || null,
    kind: input.kind ?? null,
    tags: input.tags ?? [],
    status: "idea",
    favorite: false,
  });
}

export async function updateIdea(id: string, values: Record<string, unknown>) {
  return updateRow("marketing_ideas", id, values);
}
export async function toggleIdeaFavorite(id: string, favorite: boolean) {
  return updateRow("marketing_ideas", id, { favorite });
}
export async function deleteIdea(id: string) {
  return deleteRow("marketing_ideas", id);
}

// ──────────────────────────── Kalender-events ───────────────────────
export async function createMarketingEvent(input: {
  title: string;
  type?: string;
  event_date: string;
  platform?: string | null;
  campaign_id?: string | null;
  notes?: string;
}): Promise<MarketingActionState> {
  if (!input.title?.trim()) return { error: "Begivenheden mangler en titel." };
  if (!input.event_date) return { error: "Vælg en dato." };
  return insertRow("marketing_events", {
    title: input.title.trim(),
    type: input.type ?? "opslag",
    event_date: input.event_date,
    platform: input.platform || null,
    campaign_id: input.campaign_id || null,
    notes: input.notes?.trim() || null,
    done: false,
  });
}

export async function toggleEventDone(id: string, done: boolean) {
  return updateRow("marketing_events", id, { done });
}
export async function updateMarketingEvent(id: string, values: Record<string, unknown>) {
  return updateRow("marketing_events", id, values);
}
export async function deleteMarketingEvent(id: string) {
  return deleteRow("marketing_events", id);
}

// ─────────────────────────────── Wiki ───────────────────────────────
export async function createWikiPage(input: {
  title: string;
  category?: string;
  body?: string;
}): Promise<MarketingActionState> {
  if (!input.title?.trim()) return { error: "Wiki-siden mangler en titel." };
  return insertRow("marketing_wiki", {
    title: input.title.trim(),
    category: input.category ?? "manualer",
    body: input.body?.trim() || null,
    pinned: false,
  });
}

export async function updateWikiPage(id: string, values: Record<string, unknown>) {
  return updateRow("marketing_wiki", id, values);
}
export async function toggleWikiPinned(id: string, pinned: boolean) {
  return updateRow("marketing_wiki", id, { pinned });
}
export async function deleteWikiPage(id: string) {
  return deleteRow("marketing_wiki", id);
}

// ─────────────────────────────── Medier ─────────────────────────────
export async function createMedia(input: {
  title: string;
  type?: string;
  url?: string;
  tags?: string[];
  notes?: string;
  campaign_id?: string | null;
}): Promise<MarketingActionState> {
  if (!input.title?.trim()) return { error: "Mediet mangler en titel." };
  return insertRow("marketing_media", {
    title: input.title.trim(),
    type: input.type ?? "billede",
    url: input.url?.trim() || null,
    tags: input.tags ?? [],
    notes: input.notes?.trim() || null,
    campaign_id: input.campaign_id || null,
  });
}

export async function updateMedia(id: string, values: Record<string, unknown>) {
  return updateRow("marketing_media", id, values);
}
export async function deleteMedia(id: string) {
  return deleteRow("marketing_media", id);
}

// ─────────────────────────────── Checklister ────────────────────────
export async function createChecklist(input: {
  name: string;
  items: string[];
  template_id?: string | null;
  campaign_id?: string | null;
}): Promise<MarketingActionState> {
  if (!input.name?.trim()) return { error: "Checklisten mangler et navn." };
  const items: ChecklistItem[] = (input.items ?? [])
    .filter((t) => t.trim())
    .map((t) => ({ text: t.trim(), done: false }));
  return insertRow("marketing_checklists", {
    name: input.name.trim(),
    items,
    template_id: input.template_id || null,
    campaign_id: input.campaign_id || null,
  });
}

/** Sætter den fulde items-liste (bruges når et punkt tjekkes af/tilføjes). */
export async function setChecklistItems(id: string, items: ChecklistItem[]) {
  return updateRow("marketing_checklists", id, { items });
}
export async function deleteChecklist(id: string) {
  return deleteRow("marketing_checklists", id);
}

export async function createChecklistTemplate(input: {
  name: string;
  items: string[];
}): Promise<MarketingActionState> {
  if (!input.name?.trim()) return { error: "Skabelonen mangler et navn." };
  return insertRow("marketing_checklist_templates", {
    name: input.name.trim(),
    items: (input.items ?? []).filter((t) => t.trim()).map((t) => t.trim()),
  });
}

export async function deleteChecklistTemplate(id: string) {
  return deleteRow("marketing_checklist_templates", id);
}
