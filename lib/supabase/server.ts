import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase-klient til SERVEREN (Server Components, Server Actions, Route Handlers).
 *
 * VIGTIGT (Next.js 16): cookies() er nu en asynkron funktion – derfor "await".
 * Denne klient læser/skriver session-cookies, så brugeren forbliver logget ind.
 *
 * "Husk mig" (sessionOnly):
 *  - false (standard): cookies gemmes persistent → brugeren forbliver logget
 *    ind, også efter browseren lukkes.
 *  - true: vi fjerner udløbstid, så det bliver "session-cookies", der slettes
 *    når browseren lukkes. Bruges når brugeren IKKE sætter "Husk mig".
 */
export async function createClient(options?: { sessionOnly?: boolean }) {
  const cookieStore = await cookies();
  const sessionOnly = options?.sessionOnly ?? false;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
              const finalOptions = sessionOnly
                ? { ...cookieOptions, maxAge: undefined, expires: undefined }
                : cookieOptions;
              cookieStore.set(name, value, finalOptions);
            });
          } catch {
            // setAll kan kaldes fra en Server Component, hvor cookies ikke
            // kan ændres. Det er ufarligt, hvis proxy.ts opdaterer sessionen.
          }
        },
      },
    },
  );
}
