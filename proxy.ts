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
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
