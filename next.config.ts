import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 95 bruges af logoet (components/shared/logo.tsx) for at undgå ekstra
    // komprimeringssløring på det lille, detaljerede heart+brain-ikon.
    qualities: [75, 95],
  },
};

export default nextConfig;
