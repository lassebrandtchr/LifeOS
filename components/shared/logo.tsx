"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/**
 * Logo – LifeOS' fælles brand-mærke.
 *
 * Skifter AUTOMATISK mellem to logoer afhængigt af temaet:
 *  - Dark mode  → det mørke, blå glødende ikon (icon-512.png)
 *  - Light mode → det lyse glas-ikon (icon-light-512.png)
 *
 * Animationer (Framer Motion):
 *  - ved side-load: fade-in + scale 0.97 → 1.00
 *  - ved hover: scale 1.03 + blød glød
 *  - ved temaskift: elegant crossfade mellem de to logoer
 */
const LOGO_SRC = {
  dark: "/icon-512.png",
  light: "/icon-light-512.png",
} as const;

export function Logo({
  size = 36,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Undgå hydration-mismatch: før mount kender vi ikke temaet, så vi bruger
  // dark (appens standardtema). Efter mount crossfader vi til det rigtige logo.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);
  const theme = mounted && resolvedTheme === "light" ? "light" : "dark";

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
      <AnimatePresence initial={false} mode="sync">
        <motion.span
          key={theme}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Image
            src={LOGO_SRC[theme]}
            alt="LifeOS"
            width={size}
            height={size}
            priority
            quality={95}
            className="size-full rounded-[24%]"
          />
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
