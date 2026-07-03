"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { syncEverythingNow } from "@/features/integrations/actions";

// Hver 30. minut – Lasses ønskede opdaterings-kadence.
const INTERVAL_MS = 30 * 60 * 1000;
const STORAGE_KEY = "lifeos-last-autosync";

/**
 * Usynlig baggrunds-synk. Mens appen er åben i browseren, synkroniserer den
 * Gmail/Google Kalender/Outlook/Notion automatisk hvert 30. minut – uden at
 * Lasse selv skal ind under Indstillinger og trykke "Synkronisér".
 * Supplerer den eksterne GitHub Actions-cron (også hvert 30. min), som
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
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      if (Date.now() - last < INTERVAL_MS) return;
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      const res = await syncEverythingNow();
      if (!cancelled && res?.ok) router.refresh();
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
