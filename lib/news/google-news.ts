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

/** Sikker kode-punkt → tegn (kaster ikke på ugyldige værdier). */
function fromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** Almindelige navngivne HTML-entiteter i nyhedstitler (ud over de numeriske). */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  sbquo: "‚", bdquo: "„", ndash: "–", mdash: "—",
  hellip: "…", laquo: "«", raquo: "»", middot: "·",
  copy: "©", reg: "®", trade: "™", deg: "°",
  euro: "€", pound: "£", times: "×",
  aelig: "æ", AElig: "Æ", oslash: "ø", Oslash: "Ø", aring: "å", Aring: "Å",
};

/**
 * Afkoder HTML-entiteter i titler/kilder fra RSS-feeds. Feedsene sender
 * ofte typografiske tegn som NUMERISKE referencer – fx &#8220;/&#8221;
 * (krøllede citationstegn “ ”) og &#8211; (tankestreg –) – som ellers ville
 * stå råt i overskriften. Håndterer både decimale (&#8220;), hexadecimale
 * (&#x201C;) og de gængse navngivne (&ldquo;, &amp; osv.).
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => NAMED_ENTITIES[name] ?? m)
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return null;
  return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

/**
 * Simpel, målrettet RSS-parser – virker for både Google News' format (med
 * <source>-tag) og almindelige WordPress-feeds fra de danske sites (uden;
 * dér bruges defaultSource i stedet).
 */
function parseRssItems(xml: string, limit: number, defaultSource: string | null = null): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split("<item>").slice(1);

  for (const raw of blocks) {
    if (items.length >= limit) break;
    const block = raw.split("</item>")[0] ?? raw;

    const rawTitle = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!rawTitle || !link) continue;

    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const source = sourceMatch ? decodeEntities(sourceMatch[1]) : defaultSource;

    let title = decodeEntities(rawTitle);
    // Google News' titler ender ofte med " - Kildenavn" – kilden vises
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

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Ekstra sikkerhedsnet mod for gamle artikler – Google's "when:"-operator
 * viste sig upålidelig (se fetchLayeredNews), så dette kode-side filter er
 * den eneste reelle håndhævelse af aldersgrænsen. Artikler uden dato
 * beholdes (kan ikke vurderes, men er sjældne).
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
    return parseRssItems(xml, limit * 10).filter(withinMaxAge).slice(0, limit);
  } catch {
    return [];
  }
}

// ─────────────────── Direkte danske RSS-feeds (primær kilde) ───────────────────
// Googles "site:"-søgning viste sig at give et lille, halvgammelt udpluk af
// hvert site (testet: 0 friske hits på tværs af 9 sites, selvom siterne
// udgav artikler SAMME dag). Sitenes egne feeds giver derimod altid deres
// nyeste artikler – så de er nu den primære kilde, og Google News bruges
// kun som opfyldning. FDM/Bilmagasinet/Inputmag har ingen offentlige feeds
// (testet 404/403/HTML) og dækkes derfor kun via Google-laget.

type DirectFeed = { url: string; source: string };

const CAR_FEEDS: DirectFeed[] = [
  { url: "https://boosted.dk/feed", source: "Boosted.dk" },
  { url: "https://www.hvilkenbil.dk/feed", source: "Hvilkenbil.dk" },
];

const TECH_FEEDS: DirectFeed[] = [
  { url: "https://www.mobilsiden.dk/feed", source: "Mobilsiden.dk" },
  { url: "https://meremobil.dk/feed", source: "MereMobil.dk" },
  { url: "https://www.recordere.dk/feed/", source: "Recordere.dk" },
];

// Bil-relevans-filter til at fiske bilnyt ud af tech-feeds (MereMobil m.fl.
// skriver også om elbiler) – og omvendt frasortere rene gadget-artikler.
const CAR_RELEVANT =
  /\b(bil|biler|bilen|elbil\w*|ladestander\w*|opladning|Tesla|Volkswagen|VW|Toyota|BMW|Audi|Mercedes|Volvo|Kia|Hyundai|Renault|Peugeot|Skoda|Ford|Nissan|Honda|Dacia|Polestar)\b/i;

async function fetchSiteFeed(feed: DirectFeed, force: boolean): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      ...(force ? { cache: "no-store" as const } : { next: { revalidate: REVALIDATE_SECONDS } }),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (LifeOS nyhedslæser)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, 40, feed.source).filter(withinMaxAge);
  } catch {
    return [];
  }
}

/** Alle friske artikler fra en liste af direkte feeds, nyeste først. */
async function fetchDirectFeeds(feeds: DirectFeed[], force: boolean): Promise<NewsItem[]> {
  const lists = await Promise.all(feeds.map((f) => fetchSiteFeed(f, force)));
  return lists
    .flat()
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

/**
 * Let variation: højst `maxPerSource` artikler pr. kilde i toppen af listen,
 * så ét flittigt site (fx Boosted med 40 artikler) ikke fylder hele kassen –
 * de overskydende ryger bagest i stedet for helt ud.
 */
function diversifyBySource(items: NewsItem[], maxPerSource: number): NewsItem[] {
  const counts = new Map<string, number>();
  const top: NewsItem[] = [];
  const overflow: NewsItem[] = [];
  for (const item of items) {
    const key = item.source ?? "?";
    const n = counts.get(key) ?? 0;
    if (n < maxPerSource) {
      counts.set(key, n + 1);
      top.push(item);
    } else {
      overflow.push(item);
    }
  }
  return [...top, ...overflow];
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
   * URL'er der allerede vises – ved "Opdater" skal ALLE viste artikler
   * skiftes ud, aldrig genvises. Kun artikler UDEN for denne liste kommer
   * med i resultatet (se finalizeNews) – ingen "fylder op med det gamle".
   */
  excludeUrls?: string[];
};

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
 *
 * Ved "Opdater" (excludeUrls sat) hentes ALLE tre lag altid – ikke kun til
 * "limit" er nået – for at gøre puljen af MULIGE nye artikler så stor som
 * muligt, og resultatet blandes før det klippes til "limit", så gentagne
 * klik ikke bare viser den samme håndfuld i samme rækkefølge igen.
 */
async function fetchLayeredNews(
  danishTopicQuery: string,
  englishTopicQuery: string,
  limit: number,
  { force = false, excludeUrls = [] }: NewsFetchOptions = {},
  directItems: NewsItem[] = [],
): Promise<NewsItem[]> {
  const exclude = new Set(excludeUrls);
  const isRefresh = exclude.size > 0;
  const poolLimit = isRefresh ? limit * 8 : limit;
  const freshCount = (items: NewsItem[]) => items.filter((i) => !exclude.has(i.url)).length;

  // Lag 0: sitenes egne feeds (altid friskest, altid dansk) – nyeste først.
  const seen = new Set(directItems.map((d) => d.url));
  const combined = [...directItems];
  if (!isRefresh && freshCount(combined) >= limit) return combined.slice(0, limit);

  const danishRaw = await fetchGoogleNews(
    `${DANISH_SITE_FILTER} (${danishTopicQuery}) ${MIDEAST_EXCLUDE}`,
    poolLimit,
    DA_LOCALE,
    force,
  );
  for (const item of danishRaw.filter(looksDanish)) {
    if (!seen.has(item.url)) {
      combined.push(item);
      seen.add(item.url);
    }
  }
  if (!isRefresh && freshCount(combined) >= limit) return combined.slice(0, limit);

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
  if (!isRefresh && freshCount(combined) >= limit) return combined.slice(0, limit);

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

  if (!isRefresh) return combined.slice(0, limit);

  // Refresh: KUN artikler der ikke allerede vises – aldrig fyldt op med de
  // gamle. Kan derfor godt returnere færre end "limit" (eller ingen, hvis
  // kilderne reelt ikke har mere nyt inden for 7 dage lige nu) – det er
  // mere ærligt end at genvise noget, der allerede står på skærmen.
  return shuffle(combined.filter((i) => !exclude.has(i.url))).slice(0, limit);
}

/** Arbejdstid: nyt om elbiler, fossilbiler, ladestandere og bilbranchen globalt. */
// Bredt bilstof – ikke kun elbiler: bilmærker, ny teknologi, tilbagekaldelser
// osv. generelt. Konkrete mærkenavne øger chancen for at ramme noget, da
// "bil"/"car" alene ofte taber i Google's ranking til mere specifikke ord.
const CAR_BRANDS =
  "Volkswagen OR Toyota OR BMW OR Audi OR Mercedes OR Tesla OR Volvo OR Kia OR Hyundai OR Renault OR Peugeot OR Skoda OR Ford OR Nissan OR Honda";

export async function getCarIndustryNews(limit = 5, opts?: NewsFetchOptions): Promise<NewsItem[]> {
  // Bil-sitenes fulde feeds + bil-relevante artikler fra tech-feeds
  // (MereMobil/Mobilsiden skriver også om elbiler).
  const [carDirect, techDirect] = await Promise.all([
    fetchDirectFeeds(CAR_FEEDS, opts?.force ?? false),
    fetchDirectFeeds(TECH_FEEDS, opts?.force ?? false),
  ]);
  const direct = diversifyBySource(
    [...carDirect, ...techDirect.filter((i) => CAR_RELEVANT.test(i.title))]
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    2,
  );

  return fetchLayeredNews(
    `elbil OR elbiler OR bil OR biler OR bilmærker OR bilbranchen OR ladestander OR bilteknologi OR ${CAR_BRANDS}`,
    `(electric vehicles OR EV) OR (automotive industry) OR (car manufacturers) OR (new car models) OR (car technology) OR (self-driving cars) OR ${CAR_BRANDS}`,
    limit,
    opts,
    direct,
  );
}

/** Privat tid: mest AI/tech/consumer electronics, med lidt bilnyt blandet ind. */
export async function getTechAiNews(limit = 5, opts?: NewsFetchOptions): Promise<NewsItem[]> {
  const direct = diversifyBySource(await fetchDirectFeeds(TECH_FEEDS, opts?.force ?? false), 2);

  return fetchLayeredNews(
    "kunstig intelligens OR AI OR teknologi OR elektronik OR gadgets OR elbil",
    '(artificial intelligence OR "AI") OR (consumer electronics) OR (tech industry) OR (electric vehicles)',
    limit,
    opts,
    direct,
  );
}
