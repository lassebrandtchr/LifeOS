import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { exchangeCode, fetchMicrosoftEmail } from "@/lib/microsoft/oauth";
import { saveMicrosoftConnection } from "@/features/integrations/microsoft";

/**
 * Microsoft sender brugeren hertil efter samtykke. Vi:
 *  1) tjekker state (CSRF-værn),
 *  2) bytter koden til tokens,
 *  3) gemmer forbindelsen i databasen,
 *  4) markerer Outlook Mail + Outlook Kalender som "forbundet",
 *  5) sender tilbage til Indstillinger med en kvittering.
 */
export async function GET(request: Request) {
  const site = await getSiteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(`${site}/indstillinger?microsoft=${reason}`);

  if (error || !code) return fail("afbrudt");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("ms_oauth_state")?.value;
  cookieStore.delete("ms_oauth_state");
  if (!state || !savedState || state !== savedState) return fail("fejl");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/login`);

  try {
    const redirectUri = `${site}/api/integrations/microsoft/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const email = await fetchMicrosoftEmail(tokens.accessToken);

    await saveMicrosoftConnection({ supabase, userId: user.id }, email, tokens);

    await supabase.from("integrations").upsert(
      [
        { user_id: user.id, connector_id: "outlook_mail", enabled: true, status: "connected", last_synced_at: new Date().toISOString() },
        { user_id: user.id, connector_id: "outlook_calendar", enabled: true, status: "connected", last_synced_at: new Date().toISOString() },
      ],
      { onConflict: "user_id,connector_id" },
    );

    return NextResponse.redirect(`${site}/indstillinger?microsoft=forbundet`);
  } catch {
    return fail("fejl");
  }
}
