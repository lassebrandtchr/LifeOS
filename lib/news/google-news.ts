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

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Ekstra sikkerhedsnet ud over Google's "when:7d"-søgeoperator, som kun er en
 * hint til søgningen og ikke en garanti (særligt kombineret med site:-filtre).
 * Artikler uden dato beholdes (kan ikke vurderes, men er sjældne).
 */
function withinMaxAge(item: NewsItem): boolean {
  if (!item.publishedAt) return true;
  return Date.now() - new Date(item.publishedAt).getTime() <= MAX_AGE_MS;
}

/**
 * Fanger svensk/norsk indhold, der er sluppet igennem trods hl=da&gl=DK –
 * globale/.com-sites (fx techradar.com) har ofte ikke en ægte dansk
 * redaktion, og Google returnerer så bare hvad der ranker bedst i den
 * skandinaviske sprogfamilie. æ/ø/å alene siger intet (fælles med norsk),
 * så filteret kombinerer entydige svenske tegn/ord med en liste af
 * norske stavemåder, der IKKE findes på dansk (fx "kjøre" vs. "køre").
 */
const NON_DANISH_PATTERN =
  /[äö]|\b(och|inte|även|också|mycket|väldigt|något|allt|bara|kanske)\b|\b(kjøre\w*|sannsynligvis|dessverre|veldig|riktig|skje\w*|øyeblikk\w*|spennende|heltid|ganger|ikkje)\b/i;

function looksDanish(item: NewsItem): boolean {
  return !NON_DANISH_PATTERN.test(item.title);
}

async function fetchGoogleNews(
  query: string,
  limit: number,
  locale: { hl: string; gl: string; ceid: string },
  force = false,
): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
    // Google omdirigerer nogle gange til en "korrekt" region ud fra
    // serverens IP – "redirect: follow" (fetch-standard) følger den, ellers
    // får vi et tomt svar i stedet for artikler. Ved manuel "opdater"
    // (force) springes 6-timers-cachen helt over, så man rent faktisk kan
    // få noget andet at se med det samme.
    const res = await fetch(url, {
      ...(force ? { cache: "no-store" as const } : { next: { revalidate: REVALIDATE_SECONDS } }),
      redirect: "follow",
    });
    if (!res.ok) return [];
    const xml = await res.text();
    // Parse et godt stykke flere end "limit" råt, FØR alders-/sprogfilteret
    // trækker nogle fra – Google's feed kan sagtens indeholde 100 hits, og
    // for lav grænse her risikerer at skære alle de friske/danske fra, hvis
    // de ligger langt nede i feedet.
    return parseGoogleNewsRss(xml, limit * 10).filter(withinMaxAge).slice(0, limit);
  } catch {
    return [];
  }
}

const EN_LOCALE = { hl: "en-US", gl: "US", ceid: "US:en" };
const DA_LOCALE = { hl: "da", gl: "DK", ceid: "DK:da" };

// Lasses foretrukne danske medier – prøves FØRST, uanset emne. Kun ægte
// .dk-redaktioner her; techradar.com er en global .com-side UDEN en
// garanteret dansk udgave (viste sig i praksis at levere norsk/svensk
// indhold selv med hl=da&gl=DK – testet direkte: "Beste tegnebrett",
// "Slik velger du riktig" er norske stavemåder, ikke danske) – den bruges
// i stedet som et ekstra, foretrukket bud i det engelske fallback-lag
// længere nede, aldrig som en "dansk" kilde.
const DANISH_SITES = [
  "meremobil.dk",
  "inputmag.dk",
  "recordere.dk",
  "hvilkenbil.dk",
  "fdm.dk",
  "bilmagasinet.dk",
  "ekstrabladet.dk",
];
const DANISH_SITE_FILTER = `(${DANISH_SITES.map((s) => `site:${s}`).join(" OR ")})`;
const RESERVE_GLOBAL_SITE = "techradar.com";

// Lasse vil gerne høre nyt der påvirker danskere (positivt og negativt),
// og gerne fra USA/Sverige/Norge m.fl. – men ikke Mellemøsten-konflikter,
// som ofte matcher på ord som "elbil"/"AI" uden reelt at handle om det.
const MIDEAST_EXCLUDE =
  '-Iran -Iraq -Syria -Yemen -Israel -Palestine -Lebanon -Gaza -Hamas -Houthi -"Middle East" -"Saudi Arabia"';

export type NewsFetchOptions = {
  /** Springer 6-timers-cachen over – bruges kun af "Opdater"-knappen. */
  force?: boolean;
  /**
   * URL'er der allerede vises – bruges til at give et REELT andet resultat
   * ved manuel opdatering, ikke bare de samme 6 igen. Hvis der ikke er nok
   * nye at finde, fyldes op med de ekskluderede (bedre end for få nyheder).
   */
  excludeUrls?: string[];
};

/**
 * Henter primært danske nyheder fra de foretrukne medier; suppleret med en
 * separat, foretrukket global kilde (techradar.com) og til sidst bredere
 * engelske/globale nyheder, hvis der stadig ikke er nok. Deduplikeret på
 * URL. Alle tre lag hentes og filtreres UDEN Google's "when:"-operator –
 * afprøvet i praksis at give 0 resultater når den kombineres med et
 * "site:"-filter (uafhængigt af om filteret rammer én eller flere sites).
 * "withinMaxAge" i fetchGoogleNews er derfor det ENESTE, der håndhæver
 * 7-dages-grænsen. Samme mønster for sprog: "looksDanish" er
 * sikkerhedsnettet for hl=da&gl=DK, som heller ikke er en garanti i sig selv.
 */
async function fetchLayeredNews(
  danishTopicQuery: string,
  englishTopicQuery: string,
  limit: number,
  { force = false, excludeUrls = [] }: NewsFetchOptions = {},
): Promise<NewsItem[]> {
  const exclude = new Set(excludeUrls);
  // Med en udelukkelsesliste bedes hvert lag om flere end "limit", så der
  // reelt er noget at vælge imellem efter de allerede-viste er sorteret fra.
  const poolLimit = exclude.size > 0 ? limit * 3 : limit;
  const freshCount = (items: NewsItem[]) => items.filter((i) => !exclude.has(i.url)).length;

  const danishRaw = await fetchGoogleNews(
    `${DANISH_SITE_FILTER} (${danishTopicQuery}) ${MIDEAST_EXCLUDE}`,
    poolLimit,
    DA_LOCALE,
    force,
  );
  const danish = danishRaw.filter(looksDanish);
  const seen = new Set(danish.map((d) => d.url));
  const combined = [...danish];
  if (freshCount(combined) >= limit) return finalizeNews(combined, exclude, limit);

  // "site:X OR (...)" i ét udtryk returnerede 0 hits i praksis – X hentes
  // derfor som sit eget kald og merges bagefter i stedet.
  const reserve = await fetchGoogleNews(
    `site:${RESERVE_GLOBAL_SITE} (${englishTopicQuery}) ${MIDEAST_EXCLUDE}`,
    poolLimit,
    EN_LOCALE,
    force,
  );
  for (const item of reserve) {
    if (!seen.has(item.url)) {
      combined.push(item);
      seen.add(item.url);
    }
  }
  if (freshCount(combined) >= limit) return finalizeNews(combined, exclude, limit);

  const fallback = await fetchGoogleNews(
    `(${englishTopicQuery}) ${MIDEAST_EXCLUDE}`,
    poolLimit,
    EN_LOCALE,
    force,
  );
  for (const item of fallback) {
    if (!seen.has(item.url)) {
      combined.push(item);
      seen.add(item.url);
    }
  }
  return finalizeNews(combined, exclude, limit);
}

/** Foretrækker "friske" (ikke-ekskluderede) artikler; fylder kun op med de ekskluderede hvis nødvendigt. */
function finalizeNews(combined: NewsItem[], exclude: Set<string>, limit: number): NewsItem[] {
  const fresh = combined.filter((i) => !exclude.has(i.url));
  if (fresh.length >= limit) return fresh.slice(0, limit);
  const stale = combined.filter((i) => exclude.has(i.url));
  return [...fresh, ...stale].slice(0, limit);
}

/** Arbejdstid: nyt om elbiler, fossilbiler, ladestandere og bilbranchen globalt. */
export async function getCarIndustryNews(limit = 6, opts?: NewsFetchOptions): Promise<NewsItem[]> {
  return fetchLayeredNews(
    "elbil OR elbiler OR ladestander OR bilbranchen OR bilmærker OR bil",
    '(electric vehicles OR EV) OR (automotive industry) OR (car manufacturers) OR (EV charging stations)',
    limit,
    opts,
  );
}

/** Privat tid: mest AI/tech/consumer electronics, med lidt bilnyt blandet ind. */
export async function getTechAiNews(limit = 6, opts?: NewsFetchOptions): Promise<NewsItem[]> {
  return fetchLayeredNews(
    "kunstig intelligens OR AI OR teknologi OR elektronik OR gadgets OR elbil",
    '(artificial intelligence OR "AI") OR (consumer electronics) OR (tech industry) OR (electric vehicles)',
    limit,
    opts,
  );
}
