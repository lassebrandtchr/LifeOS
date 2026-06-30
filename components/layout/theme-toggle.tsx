"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * ThemeToggle – knap der skifter mellem light og dark mode.
 * Viser sol i light mode og måne i dark mode med en blød crossfade/rotation.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Undgå "hydration mismatch": vis først ikonet når komponenten er klar i browseren.
  // Dette er et bevidst engangs-flag ved mount (anbefalet mønster fra next-themes).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Skift mellem lyst og mørkt tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Før mount kender vi ikke temaet i browseren. Vi tegner derfor et
          stabilt (usynligt) placeholder-ikon, så server og browser matcher
          præcist – ellers opstår en hydration-mismatch. */}
      {!mounted ? (
        <Sun className="size-5 opacity-0" />
      ) : (
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={isDark ? "sun" : "moon"}
            initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </motion.span>
        </AnimatePresence>
      )}
    </Button>
  );
}
