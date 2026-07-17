"use server";

import { getValidAccessToken, getGoogleConnection, getGoogleHealth } from "@/features/integrations/google";

/**
 * Live-diagnose af Google-forbindelsen. Laver RIGTIGE kald til Gmail og Google
 * Kalender og rapporterer præcis, hvad Google svarer – så vi kan se, om
 * problemet er en udløbet forbindelse, en manglende tilladelse (scope), eller
 * en slået-fra API. Bruges af diagnose-kortet under Indstillinger.
 */

export type GoogleTest = {
  connected: boolean;
  health: "notConfigured" | "notConnected" | "expired" | "ok";
  scopes: string | null;
  gmail: { ok: boolean; reason?: string };
  calendar: { ok: boolean; reason?: string };
};

async function probe(url: string, token: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.ok) return { ok: true };
    const reason = await res
      .json()
      .then((b) => (b?.error?.message as string) ?? `HTTP ${res.status}`)
      .catch(() => `HTTP ${res.status}`);
    return { ok: false, reason };
  } catch {
    return { ok: false, reason: "netværksfejl" };
  }
}

export async function testGoogleAccess(): Promise<GoogleTest> {
  const health = await getGoogleHealth();
  const conn = await getGoogleConnection();
  const scopes = conn?.scope ?? null;

  if (health !== "ok") {
    return {
      connected: health !== "notConnected" && health !== "notConfigured",
      health,
      scopes,
      gmail: { ok: false, reason: health === "expired" ? "forbindelse udløbet" : "ikke forbundet" },
      calendar: { ok: false, reason: health === "expired" ? "forbindelse udløbet" : "ikke forbundet" },
    };
  }

  const token = await getValidAccessToken();
  if (!token) {
    return {
      connected: true,
      health,
      scopes,
      gmail: { ok: false, reason: "intet gyldigt token" },
      calendar: { ok: false, reason: "intet gyldigt token" },
    };
  }

  const [gmail, calendar] = await Promise.all([
    probe("https://gmail.googleapis.com/gmail/v1/users/me/labels", token),
    probe("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader", token),
  ]);

  return { connected: true, health, scopes, gmail, calendar };
}
