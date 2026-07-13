"use client";

import * as React from "react";

/**
 * Er vi på desktop OG har brugeren ikke bedt om mindre bevægelse?
 *
 * Bruges til de tungere "flyt-rundt"-animationer (fx Action-listens
 * omrokering ved prioritetsskift), som BEVIDST kun må køre på desktop:
 *  • På mobil er layout-animationer dyre (hver frame gen-måler elementernes
 *    position) – og telefonen har i forvejen nok at se til. Samme grund som
 *    blur slås fra under 768px i globals.css.
 *  • prefers-reduced-motion respekteres, så animationen aldrig generer nogen,
 *    der har slået bevægelse fra i systemet.
 *
 * SSR-sikker: starter altid som `false` (samme på server og klient, så ingen
 * hydrerings-fejl), og slås først til efter mount. Det betyder også, at der
 * ingen animation er ved FØRSTE indlæsning – kun når listen faktisk ændrer sig
 * bagefter, hvilket er præcis dét, vi vil have.
 */
export function useDesktopMotion(): boolean {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const desktop = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setEnabled(desktop.matches && !reduced.matches);
    update();

    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  return enabled;
}
