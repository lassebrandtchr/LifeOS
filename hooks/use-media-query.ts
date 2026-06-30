"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * useMediaQuery – fortæller om en CSS media query matcher lige nu.
 * Bruges fx til at vise mobilmenu vs. sidebar.
 *
 * Vi bruger useSyncExternalStore (Reacts anbefalede måde at læse fra
 * eksterne kilder som window.matchMedia), så vi undgår unødige re-renders.
 *
 * Eksempel: const erDesktop = useMediaQuery("(min-width: 1024px)");
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", callback);
      return () => mediaQuery.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = () => window.matchMedia(query).matches;
  // På serveren findes window ikke – returnér en stabil standardværdi.
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
