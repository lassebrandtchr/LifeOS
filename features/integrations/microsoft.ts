import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  isMicrosoftConfigured,
  refreshAccessToken,
  type MicrosoftTokens,
} from "@/lib/microsoft/oauth";

/**
 * Bindeleddet mellem LifeOS og Microsoft/Outlook-forbindelsen i databasen.
 * Spejler features/integrations/google.ts.
 *
 * VIGTIGT: token-fornyelsen tager en EKSPLICIT supabase-klient + userId, så
 * den virker både for den indloggede bruger (cookie-klient) OG for cron-jobbet
 * (service-role admin-klient uden session).
 */

export type MicrosoftConnection = {
  email: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  scope: string | null;
  expiry: string | null;
};

type AuthedClient = { supabase: SupabaseClient; userId: string };

async function getAuth(): Promise<AuthedClient | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/** Læser den indloggede brugers Microsoft-forbindelse (eller null). */
export async function getMicrosoftConnection(): Promise<MicrosoftConnection | null> {
  const auth = await getAuth();
  if (!auth) return null;
  try {
    const { data } = await auth.supabase
      .from("microsoft_connections")
      .select("email, access_token, refresh_token, scope, expiry")
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (!data) return null;
    return {
      email: data.email ?? null,
      accessToken: data.access_token ?? null,
      refreshToken: data.refresh_token ?? null,
      scope: data.scope ?? null,
      expiry: data.expiry ?? null,
    };
  } catch {
    return null;
  }
}

/** Er Microsoft forbundet (nøgler sat op + forbindelse gemt)? */
export async function isMicrosoftConnected(): Promise<boolean> {
  if (!isMicrosoftConfigured()) return false;
  const conn = await getMicrosoftConnection();
  return Boolean(conn?.refreshToken);
}

/** Gemmer (opretter/opdaterer) en forbindelse. */
export async function saveMicrosoftConnection(
  auth: AuthedClient,
  email: string | null,
  tokens: MicrosoftTokens,
): Promise<void> {
  const expiry = new Date(Date.now() + tokens.expiresInSec * 1000).toISOString();
  await auth.supabase.from("microsoft_connections").upsert(
    {
      user_id: auth.userId,
      email,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      scope: tokens.scope,
      expiry,
    },
    { onConflict: "user_id" },
  );
}

export { getAuth as getMicrosoftAuth };

/**
 * Returnerer et GYLDIGT access_token for en GIVEN bruger via en GIVEN klient
 * (cookie- eller admin-klient). Fornyer automatisk hvis udløbet.
 */
export async function getValidMicrosoftTokenFor(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  if (!isMicrosoftConfigured()) return null;

  const { data } = await supabase
    .from("microsoft_connections")
    .select("access_token, refresh_token, expiry")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.refresh_token) return null;

  const expiry = data.expiry ? new Date(data.expiry).getTime() : 0;
  if (data.access_token && expiry > Date.now() + 60_000) {
    return data.access_token as string;
  }

  try {
    const refreshed = await refreshAccessToken(data.refresh_token as string);
    await supabase
      .from("microsoft_connections")
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        scope: refreshed.scope,
        expiry: new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString(),
      })
      .eq("user_id", userId);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

/** Bekvem variant for den indloggede bruger (cookie-klient). */
export async function getValidMicrosoftToken(): Promise<string | null> {
  const auth = await getAuth();
  if (!auth) return null;
  return getValidMicrosoftTokenFor(auth.supabase, auth.userId);
}
