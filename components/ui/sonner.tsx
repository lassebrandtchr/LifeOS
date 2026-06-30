"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

/**
 * Toaster – viser små "toast"-beskeder (fx "Du er nu logget ind.").
 * Følger automatisk lyst/mørkt tema og LifeOS-designet.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={(resolvedTheme as "light" | "dark") ?? "dark"}
      position="top-center"
      richColors
      toastOptions={{
        style: {
          borderRadius: "14px",
        },
      }}
    />
  );
}
