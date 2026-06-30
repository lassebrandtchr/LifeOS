"use client";

import { motion } from "framer-motion";

/**
 * Page transition. En `template.tsx` (i modsætning til `layout.tsx`)
 * gen-monteres ved hvert sideskift – perfekt til en blød overgang mellem sider.
 *
 * Diskret og hurtig (fade + lille slide opad, ease-out), så navigationen
 * føles flydende uden at være langsom. Respekterer "reduce motion" via CSS.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
