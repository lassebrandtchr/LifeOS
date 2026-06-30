import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { buildAuthUrl, isMicrosoftConfigured } from "@/lib/microsoft/oauth";

/**
 * Starter Microsoft/Outlook-forbindelsen: sender Lasse til Microsofts
 * login-/samtykkeside. Et tilfældigt "state" gemmes i en cookie og tjekkes i
 * callback'et (CSRF-værn).
 */
export async function GET() {
  const site = await getSiteUrl();

  if (!isMicrosoftConfigured()) {
    return NextResponse.redirect(`${site}/indstillinger?microsoft=mangler-noegler`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/login`);

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("ms_oauth_state", state, {
    httpOnly: true,
    secure: !site.startsWith("http://localhost"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${site}/api/integrations/microsoft/callback`;
  return NextResponse.redirect(buildAuthUrl(redirectUri, state));
}
