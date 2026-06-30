import "server-only";

/**
 * Microsoft OAuth 2.0 (Microsoft Identity Platform) – lavniveau-hjælpere.
 * Samme mønster som Google-OAuth'en, bare mod Microsoft Graph.
 *
 * Flow:
 *  1) buildAuthUrl(): sender brugeren til Microsofts login-/samtykkeside.
 *  2) Microsoft sender tilbage til vores callback med en engangs-"code".
 *  3) exchangeCode(): bytter koden til access_token + refresh_token.
 *  4) refreshAccessToken(): forny et udløbet access_token (med refresh_token).
 *
 * Nøglerne (OUTLOOK_CLIENT_ID/SECRET) sættes af Lasse i .env.local / Vercel.
 * Vi bruger "common"-tenant, så både Storgaard-arbejdskonto (Microsoft 365)
 * og evt. personlige Microsoft-konti virker.
 */

const TENANT = "common";
const AUTH_ENDPOINT = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

/**
 * Rettigheder LifeOS beder om:
 *  - offline_access  → vi får et refresh_token (kan synke i baggrunden)
 *  - openid/email/profile → vi kan læse hvilken konto der er forbundet
 *  - Mail.Read       → læse Outlook-mail
 *  - Calendars.Read  → læse Outlook-kalender
 * (Kun læseadgang – LifeOS ændrer ikke noget i Outlook.)
 */
export const MICROSOFT_SCOPES = [
  "offline_access",
  "openid",
  "email",
  "profile",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Calendars.Read",
];

/** Er Microsoft-nøglerne sat op endnu? */
export function isMicrosoftConfigured(): boolean {
  return Boolean(
    process.env.OUTLOOK_CLIENT_ID &&
      process.env.OUTLOOK_CLIENT_SECRET &&
      !process.env.OUTLOOK_CLIENT_ID.startsWith("din-"),
  );
}

export type MicrosoftTokens = {
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  expiresInSec: number;
};

/** Bygger URL'en til Microsofts samtykkeside. */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    prompt: "consent", // sikrer at refresh_token kommer med
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Bytter engangs-koden til tokens. */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<MicrosoftTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: MICROSOFT_SCOPES.join(" "),
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
): Promise<MicrosoftTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      scope: MICROSOFT_SCOPES.join(" "),
    }),
  });
  if (!res.ok) throw new Error(`Token-fornyelse fejlede: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    scope: data.scope ?? "",
    expiresInSec: data.expires_in ?? 3600,
  };
}

/** Henter den forbundne kontos e-mail (til visning + verifikation). */
export async function fetchMicrosoftEmail(
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.mail as string) ?? (data.userPrincipalName as string) ?? null;
  } catch {
    return null;
  }
}
