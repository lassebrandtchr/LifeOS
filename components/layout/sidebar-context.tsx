"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

/**
 * Delt tilstand for sidebaren: er den "pinnet" (fast, fylder plads i layoutet)
 * eller "foldet ind" (skjult ude i venstre side, popper frem ved hover).
 *
 * Toggle-knappen sidder i Topbar (øverste højre hjørne), mens selve
 * sidebaren og hovedindholdet ligger i AppShellClient – de deler tilstanden
 * her, så knappen kan folde sidebaren ind/ud og indholdet reflower af sig selv.
 *
 * Valget huskes i localStorage, så det holder på tværs af sidevisninger.
 */

type SidebarCtx = {
  collapsed: boolean;
  toggle: () => void;
};

const Ctx = createContext<SidebarCtx | null>(null);
const STORAGE_KEY = "lifeos-sidebar-collapsed";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Læs gemt valg efter mount (undgår hydrerings-mismatch: server render er
  // altid "pinnet", derefter retter vi ind efter localStorage).
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      /* localStorage kan være blokeret – så starter vi bare pinnet */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignorér */
      }
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}

export function useSidebar(): SidebarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSidebar skal bruges inden i <SidebarProvider>");
  return ctx;
}
