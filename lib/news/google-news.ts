import "server-only";

import type { NewsItem } from "@/lib/news/types";

/**
 * Nyheder via Google News' RSS-feed – ingen API-nøgle nødvendig, og
 * kilderne er per definition dem Google selv finder relevante/troværdige
 * (bruges direkte af Lasses krav om "velkendte kilder som Google også
 * bruger"). Kun til forsidens "Nyheder fra bilverdenen"/tech-sektion.
 *
 * Next.js' fetch-cache (revalidate: 6 timer) sørger for "opdateres hver
 * 6. time" uden noget separat cron-job.
 */

const REVALIDATE_SECONDS = 6 * 60 * 60;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return null;
  return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

/** Simpel, målrettet RSS-parser til Google News' kendte, stabile format. */
function parseGoogleNewsRss(xml: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split("<item>").slice(1);

  for (const raw of blocks) {
    if (items.length >= limit) break;
    const block = raw.split("</item>")[0] ?? raw;

    const rawTitle = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!rawTitle || !link) continue;

    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const source = sourceMatch ? decodeEntities(sourceMatch[1]) : null;

    let title = decodeEntities(rawTitle);
    // Google News' titler ender ofte med " - Kildenavn" – kildens vises
    // allerede separat, så det fjernes for en renere overskrift.
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, title.length - source.length - 3).trim();
    }

    const pubDate = extractTag(block, "pubDate");
    items.push({
      title,
      url: link.trim(),
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
    });
  }

  return items;
}

async function fetchGoogleNews(query: string, limit: number): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleNewsRss(xml, limit);
  } catch {
    return [];
  }
}

/** Arbejdstid: nyt om elbiler, fossilbiler, ladestandere og bilbranchen globalt. */
export async function getCarIndustryNews(limit = 6): Promise<NewsItem[]> {
  return fetchGoogleNews(
    '(electric vehicles OR EV) OR (automotive industry) OR (car manufacturers) OR (EV charging stations) when:2d',
    limit,
  );
}

/** Privat tid: mest AI/tech/consumer electronics, med lidt bilnyt blandet ind. */
export async function getTechAiNews(limit = 6): Promise<NewsItem[]> {
  return fetchGoogleNews(
    '(artificial intelligence OR "AI") OR (consumer electronics) OR (tech industry) OR (electric vehicles) when:2d',
    limit,
  );
}
