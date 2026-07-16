import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * proxy.ts er Next.js 16's afløser for det gamle "middleware.ts".
 * Den kører på serveren FØR en side renderes – perfekt til at opdatere
 * brugerens session (og senere: beskytte ruter bag login).
 *
 * I Fase 2 forfrisker vi blot sessionen. Login-beskyttelse tilføjes senere.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Kør på alle ruter UNDTAGEN:
     * - _next/static (build-filer)
     * - _next/image (billedoptimering)
     * - favicon og almindelige billedfiler
     * - robots.txt/manifest.webmanifest – Next.js' egne metadata-ruter, som
     *   søgemaskiner/browseren SKAL kunne hente uden login. Uden denne
     *   undtagelse blev robots.txt omdirigeret 307 → /login, så en crawler
     *   aldrig så "Disallow: /"-reglen (app/robots.ts) – den fik i stedet
     *   en login-omdirigering, som ikke pålideligt tolkes som "må ikke
     *   crawles" af alle søgemaskiner.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
