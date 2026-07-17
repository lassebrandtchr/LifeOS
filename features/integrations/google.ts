import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  isGoogleConfigured,
  refreshAccessToken,
  GoogleInvalidGrantError,
  type GoogleTokens,
} from "@/lib/google/oauth";

/**
 * Bindeleddet mellem LifeOS og Google-forbindelsen i databasen.
 * Læser/gemmer tokens (RLS sikrer egne data) og leverer altid et GYLDIGT
 * access_token (fornyer automatisk, hvis det er udløbet).
 */

export type GoogleConnection = {
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

/** Læser brugerens Google-forbindelse (eller null). */
export async function getGoogleConnection(): Promise<GoogleConnection | null> {
  const auth = await getAuth();
  if (!auth) return null;
  try {
    const { data } = await auth.supabase
      .from("google_connections")
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

/** Er Google forbundet (nøgler sat op + forbindelse gemt)? */
export async function isGoogleConnected(): Promise<boolean> {
  if (!isGoogleConfigured()) return false;
  const conn = await getGoogleConnection();
  return Boolean(conn?.refreshToken);
}

/**
 * Sundhedstjek på Google-forbindelsen. Skelner de tre tilstande, der ellers
 * ligner hinanden i UI'et:
 *   - notConfigured: der er slet ingen Google-nøgler i appen.
 *   - notConnected:  Lasse har aldrig forbundet (eller er blevet ryddet).
 *   - expired:       forbundet, MEN token'et kan ikke fornyes (typisk 7-dages-
 *                    udløbet fra "Testing"-mode) → skal forbindes igen.
 *   - ok:            alt virker.
 */
export type GoogleHealth = "notConfigured" | "notConnected" | "expired" | "ok";

export async function getGoogleHealth(): Promise<GoogleHealth> {
  try {
    if (!isGoogleConfigured()) return "notConfigured";
    const conn = await getGoogleConnection();
    if (!conn?.refreshToken) return "notConnected";
    const token = await getValidAccessToken();
    return token ? "ok" : "expired";
  } catch (e) {
    // Må ALDRIG kaste – kaldes fra en server-action ved hver /mail-load.
    console.error("[getGoogleHealth] fejlede:", e);
    return "expired";
  }
}

/**
 * Blev der givet Gmail-adgang, da Google blev forbundet?
 *
 * Når man forbinder Google, kan man fravælge enkelte tilladelser på
 * samtykkeskærmen. Fravælger man Gmail (men beholder Kalender), gemmes en
 * forbindelse UDEN gmail-scope – kalender virker, men Gmail giver 403. Vi
 * læser den gemte scope-streng, så appen kan sige det præcist i stedet for
 * bare "(403)".
 */
export async function hasGmailScope(): Promise<boolean> {
  const conn = await getGoogleConnection();
  return Boolean(conn?.scope && /gmail/i.test(conn.scope));
}

/** Gemmer (opretter/opdaterer) en forbindelse. */
export async function saveGoogleConnection(
  auth: AuthedClient,
  email: string | null,
  tokens: GoogleTokens,
): Promise<void> {
  const expiry = new Date(Date.now() + tokens.expiresInSec * 1000).toISOString();
  await auth.supabase.from("google_connections").upsert(
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

// Eksportér getAuth-typen til actions (disconnect/sync).
export { getAuth as getGoogleAuth };

/**
 * Returnerer et GYLDIGT access_token for en GIVEN bruger via en GIVEN klient
 * (cookie- eller service-role admin-klient). Fornyer automatisk hvis udløbet.
 * Det er DENNE der gør baggrunds-synk (cron) mulig – den er ikke afhængig af
 * en session/cookie.
 */
export async function getValidAccessTokenFor(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  if (!isGoogleConfigured()) return null;

  const { data } = await supabase
    .from("google_connections")
    .select("access_token, refresh_token, expiry")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.refresh_token) return null;

  const expiry = data.expiry ? new Date(data.expiry).getTime() : 0;
  // Gyldigt i mindst 60 sek. endnu? Så brug det direkte.
  if (data.access_token && expiry > Date.now() + 60_000) {
    return data.access_token as string;
  }

  // Ellers: forny (uden at røre e-mailen).
  try {
    const refreshed = await refreshAccessToken(data.refresh_token as string);
    await supabase
      .from("google_connections")
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        scope: refreshed.scope,
        expiry: new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString(),
      })
      .eq("user_id", userId);
    return refreshed.accessToken;
  } catch (e) {
    // Google siger selv, at refresh_token'et er dødt (udløbet/tilbagekaldt) –
    // typisk fordi OAuth-appen står i Google Cloud Console som "Testing"
    // (der udløber Google refresh_tokens automatisk efter 7 dage). Rydder
    // tokens, så "Forbundet"-badgen ikke lyver, og Lasse ser "Forbind"-
    // knappen igen i stedet for en forvirrende "allerede forbundet, men
    // synk fejler"-tilstand. En forbigående netværks-/serverfejl (alt
    // andet) rører IKKE forbindelsen – den prøver bare igen ved næste synk.
    if (e instanceof GoogleInvalidGrantError) {
      await supabase
        .from("google_connections")
        .update({ access_token: null, refresh_token: null })
        .eq("user_id", userId);
    }
    return null;
  }
}

/**
 * Returnerer et GYLDIGT access_token for den indloggede bruger (cookie-klient).
 * Returnerer null, hvis brugeren ikke er forbundet.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const auth = await getAuth();
  if (!auth) return null;
  return getValidAccessTokenFor(auth.supabase, auth.userId);
}
