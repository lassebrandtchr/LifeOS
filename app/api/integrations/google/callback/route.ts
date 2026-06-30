import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { exchangeCode, fetchGoogleEmail } from "@/lib/google/oauth";
import { saveGoogleConnection } from "@/features/integrations/google";

/**
 * Google sender brugeren hertil efter samtykke. Vi:
 *  1) tjekker state (CSRF-værn),
 *  2) bytter koden til tokens,
 *  3) gemmer forbindelsen i databasen,
 *  4) markerer Gmail + Google Kalender som "forbundet" i Integration Center,
 *  5) sender tilbage til Indstillinger med en kvittering.
 */
export async function GET(request: Request) {
  const site = await getSiteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(`${site}/indstillinger?google=${reason}`);

  if (error || !code) return fail("afbrudt");

  // Verificér state mod cookien.
  const cookieStore = await cookies();
  const savedState = cookieStore.get("g_oauth_state")?.value;
  cookieStore.delete("g_oauth_state");
  if (!state || !savedState || state !== savedState) return fail("fejl");

  // Kræver login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/login`);

  try {
    const redirectUri = `${site}/api/integrations/google/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const email = await fetchGoogleEmail(tokens.accessToken);

    await saveGoogleConnection({ supabase, userId: user.id }, email, tokens);

    // Markér de to Google-connectors som forbundne.
    await supabase.from("integrations").upsert(
      [
        { user_id: user.id, connector_id: "gmail", enabled: true, status: "connected", last_synced_at: new Date().toISOString() },
        { user_id: user.id, connector_id: "google_calendar", enabled: true, status: "connected", last_synced_at: new Date().toISOString() },
      ],
      { onConflict: "user_id,connector_id" },
    );

    return NextResponse.redirect(`${site}/indstillinger?google=forbundet`);
  } catch {
    return fail("fejl");
  }
}
