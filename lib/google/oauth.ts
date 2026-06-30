import "server-only";

/**
 * Google OAuth 2.0 – lavniveau-hjælpere (ingen eksterne pakker, bare fetch).
 *
 * Flow:
 *  1) buildAuthUrl(): sender brugeren til Googles login-/samtykkeside.
 *  2) Google sender tilbage til vores callback med en engangs-"code".
 *  3) exchangeCode(): bytter koden til access_token + refresh_token.
 *  4) refreshAccessToken(): forny et udløbet access_token (med refresh_token).
 *
 * Nøglerne (GOOGLE_CLIENT_ID/SECRET) sættes af Lasse i .env.local.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * De rettigheder LifeOS beder om.
 * `calendar` (fuld) frem for kun `calendar.events`, så vi også kan LISTE alle
 * brugerens kalendere (fx den delte "Hanne og Lasse"), ikke kun den primære.
 */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
];

/** Er Google-nøglerne sat op endnu? */
export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export type GoogleTokens = {
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  expiresInSec: number;
};

/** Bygger URL'en til Googles samtykkeside. */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline", // → vi får et refresh_token
    prompt: "consent", // → sikrer at refresh_token altid kommer med
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Bytter engangs-koden til tokens. */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token-udveksling fejlede: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    scope: data.scope ?? "",
    expiresInSec: data.expires_in ?? 3600,
  };
}

/** Forny et access_token med et refresh_token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token-fornyelse fejlede: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // Google sender sjældent et nyt
    scope: data.scope ?? "",
    expiresInSec: data.expires_in ?? 3600,
  };
}

/** Henter brugerens e-mail ud fra et access_token (til visning + verifikation). */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.email as string) ?? null;
  } catch {
    return null;
  }
}
