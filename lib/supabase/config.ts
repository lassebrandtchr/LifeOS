/**
 * Hjælpefunktion: er Supabase sat rigtigt op endnu?
 *
 * LifeOS skal kunne køre HELT uden Supabase-nøgler (fx mens Lasse stadig er ved
 * at oprette sit Supabase-projekt). Når nøglerne mangler eller stadig er
 * pladsholdere ("din-..."), kører appen i en åben "demo-tilstand" uden login.
 *
 * Så snart de rigtige nøgler ligger i .env.local, slår login og
 * rute-beskyttelse automatisk til. Ingen kodeændringer nødvendige.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      anonKey &&
      !url.startsWith("din-") &&
      !anonKey.startsWith("din-") &&
      url.includes("http"),
  );
}
