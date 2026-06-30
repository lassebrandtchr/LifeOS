"use client";

import { motion } from "framer-motion";

/**
 * AmbientBackground – diskrete, langsomt flydende gradient-"blobs", der giver
 * dybde og en premium-fornemmelse (à la Arc/Vercel) UDEN tunge 3D-biblioteker.
 *
 * Bygget med blot blur + Framer Motion for at holde det let og hurtigt.
 * Ligger fast bag alt indhold, fanger ingen klik, og er bevidst lav-opacity.
 * Brugere med "reduce motion" får statiske blobs (se globals.css).
 */
const TRANSITION = {
  duration: 24,
  repeat: Infinity,
  repeatType: "mirror" as const,
  ease: "easeInOut" as const,
};

export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="ambient-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="absolute -left-32 -top-40 size-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--brand) 38%, transparent), transparent 70%)",
          opacity: 0.18,
        }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.08, 1] }}
        transition={TRANSITION}
      />
      <motion.div
        className="absolute -right-40 top-1/4 size-[30rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 34%, transparent), transparent 70%)",
          opacity: 0.16,
        }}
        animate={{ x: [0, -50, 0], y: [0, 60, 0], scale: [1, 1.12, 1] }}
        transition={{ ...TRANSITION, duration: 30 }}
      />
      <motion.div
        className="absolute bottom-[-12rem] left-1/3 size-[32rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--accent-work) 30%, transparent), transparent 70%)",
          opacity: 0.14,
        }}
        animate={{ x: [0, 40, 0], y: [0, -40, 0], scale: [1, 1.06, 1] }}
        transition={{ ...TRANSITION, duration: 27 }}
      />
    </div>
  );
}
