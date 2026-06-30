import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Offentlige ruter, som man må se UDEN at være logget ind.
 * Alt andet kræver login, når Supabase er sat op.
 */
const PUBLIC_PATHS = [
  "/login",
  "/opret",
  "/glemt-kodeord",
  "/nulstil-kodeord",
  "/bekraeft",
  "/auth", // /auth/callback (bekræftelses-/nulstillingslinks)
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * updateSession opdaterer brugerens Supabase-session ved hver request OG
 * beskytter hele appen (kaldes fra proxy.ts – Next.js 16's afløser for middleware).
 *
 *  - Ingen Supabase-nøgler endnu → appen kører åbent (demo-tilstand).
 *  - Ikke logget ind + beskyttet rute → send til /login.
 *  - Logget ind + på en login-/opret-side → send til forsiden.
 *
 * Dette er det første beskyttelseslag. Sider/DAL tjekker også selv (lagdelt
 * sikkerhed), så ingen data kan tilgås uden gyldig session.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Ingen nøgler endnu (placeholders) → lad appen køre uden auth.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Forfrisker sessionen og henter brugeren (vigtigt for Server Components).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Ikke logget ind + beskyttet rute → til login.
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Logget ind, men står på en login-/opret-side → ind i appen.
  if (user && isPublicPath(pathname) && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
