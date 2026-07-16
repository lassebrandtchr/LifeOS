import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 95 bruges af logoet (components/shared/logo.tsx) for at undgå ekstra
    // komprimeringssløring på det lille, detaljerede heart+brain-ikon.
    qualities: [75, 95],
  },
  // Sikkerheds-headers på ALLE ruter. Bevidst uden en Content-Security-Policy
  // her – appen bruger inline styles (Tiptap, framer-motion) og ville kræve
  // grundig test for ikke at blive brudt af en stram CSP. De fire nedenfor er
  // "sikre" tilføjelser: de kan ikke ødelægge noget, appen selv gør.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Forhindrer at appen vises i en <iframe> på et andet site
          // (clickjacking – nogen narrer dig til at klikke i en usynlig
          // kopi af LifeOS oven på en anden side).
          { key: "X-Frame-Options", value: "DENY" },
          // Forhindrer browseren i at "gætte" en anden filtype end den
          // Content-Type, serveren angiver (kan ellers udnyttes til at få
          // en uploadet fil til at blive kørt som script).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sender ikke den fulde URL (kan indeholde søgeord, id'er) videre
          // til andre sites, når man klikker et link ud af appen.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Appen bruger ikke kamera/mikrofon/lokation – luk eksplicit for dem.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
