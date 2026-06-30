import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-klient til BROWSEREN (Client Components).
 * Bruger NEXT_PUBLIC_* miljøvariabler, da disse er sikre at sende til browseren.
 *
 * Bemærk: Login og databasekald bygges først i en senere fase.
 * Her etablerer vi kun fundamentet.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
