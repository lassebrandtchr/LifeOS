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

async function fetchGoogleNews(
  query: string,
  limit: number,
  locale: { hl: string; gl: string; ceid: string },
): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
    // Google omdirigerer nogle gange til en "korrekt" region ud fra
    // serverens IP – "redirect: follow" (fetch-standard) følger den, ellers
    // får vi et tomt svar i stedet for artikler.
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, redirect: "follow" });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleNewsRss(xml, limit);
  } catch {
    return [];
  }
}

const EN_LOCALE = { hl: "en-US", gl: "US", ceid: "US:en" };
const DA_LOCALE = { hl: "da", gl: "DK", ceid: "DK:da" };

// Lasses foretrukne danske medier – prøves FØRST, uanset emne.
const DANISH_SITES = [
  "meremobil.dk",
  "inputmag.dk",
  "recordere.dk",
  "techradar.com",
  "hvilkenbil.dk",
];
const DANISH_SITE_FILTER = `(${DANISH_SITES.map((s) => `site:${s}`).join(" OR ")})`;

/**
 * Henter primært danske nyheder fra de foretrukne medier; suppleret med
 * globale/engelske nyheder, hvis der ikke er nok danske at vise. Deduplikeret
 * på URL, så en artikel aldrig optræder to gange.
 */
async function fetchLayeredNews(
  danishTopicQuery: string,
  englishTopicQuery: string,
  limit: number,
): Promise<NewsItem[]> {
  const danish = await fetchGoogleNews(
    `${DANISH_SITE_FILTER} (${danishTopicQuery})`,
    limit,
    DA_LOCALE,
  );
  if (danish.length >= limit) return danish.slice(0, limit);

  const seen = new Set(danish.map((d) => d.url));
  const fallback = await fetchGoogleNews(englishTopicQuery, limit, EN_LOCALE);
  const combined = [...danish];
  for (const item of fallback) {
    if (combined.length >= limit) break;
    if (!seen.has(item.url)) {
      combined.push(item);
      seen.add(item.url);
    }
  }
  return combined;
}

/** Arbejdstid: nyt om elbiler, fossilbiler, ladestandere og bilbranchen globalt. */
export async function getCarIndustryNews(limit = 6): Promise<NewsItem[]> {
  return fetchLayeredNews(
    "elbil OR elbiler OR ladestander OR bilbranchen OR bilmærker OR bil",
    '(electric vehicles OR EV) OR (automotive industry) OR (car manufacturers) OR (EV charging stations) when:2d',
    limit,
  );
}

/** Privat tid: mest AI/tech/consumer electronics, med lidt bilnyt blandet ind. */
export async function getTechAiNews(limit = 6): Promise<NewsItem[]> {
  return fetchLayeredNews(
    "kunstig intelligens OR AI OR teknologi OR elektronik OR gadgets OR elbil",
    '(artificial intelligence OR "AI") OR (consumer electronics) OR (tech industry) OR (electric vehicles) when:2d',
    limit,
  );
}
