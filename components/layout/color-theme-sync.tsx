"use client";

import { useEffect } from "react";

import { THEME_STORAGE_KEY, isColorThemeId } from "@/features/theme/themes";

/**
 * Gen-anvender farvetemaet (data-theme på <html>) EFTER React-hydration.
 *
 * Inline-scriptet i app/layout.tsx sætter attributten før første paint (så
 * intet blinker), men React 19 fjerner den under hydration igen, fordi den
 * server-renderede <html> ikke har attributten. Denne komponent sætter den
 * derfor tilbage ved mount – samme totrins-mønster som next-themes selv
 * bruger til .dark-klassen.
 */
export function ColorThemeSync() {
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_STORAGE_KEY);
      if (isColorThemeId(t) && t !== "skov") {
        document.documentElement.setAttribute("data-theme", t);
      }
    } catch {
      // localStorage blokeret – standardtemaet bruges bare.
    }
  }, []);
  return null;
}
