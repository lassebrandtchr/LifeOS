import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Auth-callback. Hertil sender Supabase brugeren tilbage, når de klikker på
 * bekræftelses- eller nulstillingslinket i en e-mail. Vi bytter den
 * engangs-"code", linket indeholder, til en rigtig session.
 *
 * ?next=... bestemmer hvor brugeren sendes hen bagefter (fx /nulstil-kodeord).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Noget gik galt (manglende eller udløbet kode).
  return NextResponse.redirect(`${origin}/login?flash=fejl`);
}
