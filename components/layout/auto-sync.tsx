"use client";

import { useEffect } from "react";

import { syncEverythingNow } from "@/features/integrations/actions";

// 25 min (ikke 30) – lidt margin, så det rent faktisk altid nås inden for de
// 30 minutter Lasse bad om, selvom han lige har navigeret væk fra en side.
const INTERVAL_MS = 25 * 60 * 1000;
const STORAGE_KEY = "lifeos-last-autosync";

/**
 * Usynlig baggrunds-synk. Mens appen er åben i browseren, forsøger den at
 * synkronisere Gmail/Google Kalender/Outlook/Notion automatisk hvert 25.
 * minut – uden at Lasse selv skal ind under Indstillinger og trykke
 * "Synkronisér". Supplerer (rammer ikke i vejen for) den eksterne
 * GitHub Actions-cron (hvert 15. min), som kører selv når appen er lukket.
 *
 * Rent client-side timestamp i localStorage – ingen ny database-forespørgsel
 * nødvendig, og syncEverythingNow() er allerede no-op-sikker pr. connector.
 */
export function AutoSync() {
  useEffect(() => {
    function attempt() {
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      if (Date.now() - last < INTERVAL_MS) return;
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      void syncEverythingNow();
    }
    attempt();
    const id = setInterval(attempt, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
