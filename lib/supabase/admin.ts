import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase-klient med SERVICE ROLE – kun til serveren, ALDRIG browseren.
 *
 * Almindelige klienter (lib/supabase/server.ts) er bundet til den indloggede
 * brugers session-cookie. Det virker IKKE i et cron-job, som kører helt uden
 * en bruger (ingen cookie, ingen request).
 *
 * Denne klient bruger service role-nøglen, som omgår RLS, så baggrunds-synken
 * kan læse forbindelser og skrive mails/aftaler/opgaver på vegne af ejeren.
 * Vi sætter ALTID user_id selv på hver række, så data forbliver korrekt isoleret.
 */

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith("din-"),
  );
}

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
