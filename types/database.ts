/**
 * Pladsholder for de typer, Supabase senere genererer ud fra din database.
 *
 * Når databasen er bygget (senere fase), erstattes denne fil af output fra:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 *
 * Indtil da holder vi en tom struktur, så koden kan typetjekkes.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
