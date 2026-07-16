import type { MetadataRoute } from "next";

/**
 * LifeOS er et privat, indlogget værktøj – ikke en offentlig side, der skal
 * findes via Google. Alt bag login er allerede beskyttet af proxy.ts, men
 * dette forhindrer søgemaskiner i overhovedet at forsøge at crawle/indeksere
 * URL'er (fx login-siden selv), som ellers ikke har nogen grund til at stå
 * i et søgeresultat.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
