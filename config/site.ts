/**
 * Global app-konfiguration – ét sted at ændre navn, beskrivelse osv.
 */
export const siteConfig = {
  name: "LifeOS",
  shortName: "LifeOS",
  description:
    "Dit personlige AI Operating System – privat liv og Storgaard Biler samlet i ét premium-interface.",
  owner: "Lasse",
  locale: "da",
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * Den indloggede bruger (vises i sidebar/topbar).
 * FASE 3: stadig statisk. Når rigtigt login bygges senere, kommer disse
 * data fra Supabase. Læg dit foto i public/lasse.jpg, så vises det automatisk.
 */
export const currentUser = {
  name: "Lasse",
  email: "lasse@storgaardbiler.dk",
  avatar: "/lasse.jpg",
  initials: "L",
  status: "Logget ind",
} as const;
