import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google/oauth";

/**
 * Starter Google-forbindelsen: sender Lasse til Googles login-/samtykkeside.
 * Et tilfældigt "state" gemmes i en cookie og tjekkes i callback'et (CSRF-værn).
 */
export async function GET() {
  const site = await getSiteUrl();

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${site}/indstillinger?google=mangler-noegler`);
  }

  // Kræver login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/login`);

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("g_oauth_state", state, {
    httpOnly: true,
    secure: !site.startsWith("http://localhost"),
    sameSite: "lax",
    maxAge: 600, // 10 min
    path: "/",
  });

  const redirectUri = `${site}/api/integrations/google/callback`;
  return NextResponse.redirect(buildAuthUrl(redirectUri, state));
}
