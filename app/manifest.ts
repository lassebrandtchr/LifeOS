import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * PWA-manifest. Gør LifeOS installerbar på iPhone, iPad og desktop
 * ("Føj til hjemmeskærm"). Next.js serverer denne på /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} – Dit AI-styresystem`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#060c1c",
    theme_color: "#2563eb",
    lang: "da",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
