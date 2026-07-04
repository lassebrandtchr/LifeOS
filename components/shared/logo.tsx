"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Logo – LifeOS' fælles brand-mærke.
 *
 * Viser automatisk det rigtige ikon pr. tema:
 *  - Dark mode  → det mørke, glødende ikon (icon-512.png)
 *  - Light mode → det lyse glas-ikon (icon-light-512.png)
 *
 * BEGGE billeder er altid monteret, og temaskiftet crossfades med ren
 * CSS-opacity (.dark-klassen). Tidligere blev der skiftet med
 * AnimatePresence (mount/unmount), men det AFBRØD billed-indlæsningen
 * midt i temaskiftet, så logoet kunne ende helt tomt i light mode.
 * CSS-løsningen kan ikke rammes af det, kræver ingen useTheme/mounted-
 * tilstand (ingen hydration-blink) og giver samme bløde overgang.
 *
 * "logo-adapt"-klassen farvetilpasser ikonet til det valgte farvetema
 * (hue-rotate pr. data-theme, se globals.css).
 *
 * Animationer (Framer Motion): fade-in + scale ved load, glød ved hover.
 */
export function Logo({
  size = 36,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "relative shrink-0 rounded-[24%] transition-shadow duration-300 hover:shadow-glow",
        className,
      )}
      style={{ width: size, height: size }}
      initial={animated ? { opacity: 0, scale: 0.97 } : false}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Light-ikon: synligt i light mode, fadet ud i dark mode */}
      <Image
        src="/icon-light-512.png"
        alt="LifeOS"
        width={size}
        height={size}
        priority
        quality={95}
        className="logo-adapt absolute inset-0 size-full rounded-[24%] opacity-100 transition-opacity duration-300 dark:opacity-0"
      />
      {/* Dark-ikon: synligt i dark mode */}
      <Image
        src="/icon-512.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority
        quality={95}
        className="logo-adapt absolute inset-0 size-full rounded-[24%] opacity-0 transition-opacity duration-300 dark:opacity-100"
      />
    </motion.div>
  );
}
