import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Bindeleddet mellem LifeOS og Notion-forbindelsen i databasen.
 * Gemmer/henter integrationens token (RLS sikrer egne data).
 */

async function getAuth() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/** Læser en brugers Notion-token via en GIVEN klient (cookie eller admin). */
export async function getNotionTokenFor(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("notion_connections")
      .select("token")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.token as string) ?? null;
  } catch {
    return null;
  }
}

/** Læser den indloggede brugers Notion-token (eller null). */
export async function getNotionToken(): Promise<string | null> {
  const auth = await getAuth();
  if (!auth) return null;
  return getNotionTokenFor(auth.supabase, auth.userId);
}

/** Er Notion forbundet? */
export async function isNotionConnected(): Promise<boolean> {
  const token = await getNotionToken();
  return Boolean(token);
}
