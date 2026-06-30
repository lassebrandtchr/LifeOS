import { headers } from "next/headers";

/**
 * Finder appens fulde URL (fx til at bygge bekræftelses- og nulstillingslinks
 * i e-mails). Bruger NEXT_PUBLIC_SITE_URL hvis sat, ellers den indkommende
 * requests host. Returnerer altid UDEN afsluttende skråstreg.
 */
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && fromEnv.startsWith("http")) {
    return fromEnv.replace(/\/$/, "");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
