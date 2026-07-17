"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { syncEverythingNow } from "@/features/integrations/actions";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

// Hver 15. minut – Lasses ønskede opdaterings-kadence (hele året rundt).
const INTERVAL_MS = 15 * 60 * 1000;
const STORAGE_KEY = "lifeos-last-autosync";

/**
 * Usynlig baggrunds-synk. Mens appen er åben i browseren, synkroniserer den
 * Gmail/Google Kalender/Outlook/Notion automatisk hvert 15. minut – uden at
 * Lasse selv skal ind under Indstillinger og trykke "Synkronisér".
 * Supplerer den eksterne GitHub Actions-cron (også hvert 15. min), som
 * kører selv når appen er lukket.
 *
 * VIGTIGT: efter en gennemført synk kaldes router.refresh(), så den side
 * man står på rent faktisk viser de nye data med det samme – uden dette
 * blev databasen opdateret i baggrunden, men skærmen blev stående med de
 * gamle mails, indtil man selv navigerede eller genindlæste.
 *
 * Rent client-side timestamp i localStorage – ingen ny database-forespørgsel
 * nødvendig, og syncEverythingNow() er allerede no-op-sikker pr. connector.
 */
export function AutoSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function attempt() {
      // safeGetItem/safeSetItem: localStorage kaster i Safari privat browsing
      // og når telefonens lager er fyldt – det må aldrig vælte appen.
      const last = Number(safeGetItem(STORAGE_KEY) ?? 0);
      if (Date.now() - last < INTERVAL_MS) return;
      safeSetItem(STORAGE_KEY, String(Date.now()));
      // Try/catch: baggrunds-synk er "best effort". Et fejlet netværkskald på
      // mobil må ikke give en ubehandlet fejl – vi prøver bare igen næste gang.
      try {
        const res = await syncEverythingNow();
        if (!cancelled && res?.ok) router.refresh();
      } catch {
        // Stille fejl – synk forsøges igen ved næste interval.
      }
    }

    void attempt();
    const id = setInterval(() => void attempt(), INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  return null;
}
