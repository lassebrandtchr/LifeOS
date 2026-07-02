/**
 * Delt, ren nyheds-type UDEN "server-only" – må gerne importeres af
 * klient-komponenter (fx news-section.tsx). Selve hentningen (Google
 * News RSS) ligger i google-news.ts, som ER server-only.
 */
export type NewsItem = {
  title: string;
  url: string;
  source: string | null;
  publishedAt: string | null;
};

/** Kort relativ tid ("3t", "i går") til visning ved hver nyhed. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "nu";
  if (hours < 24) return `${hours}t`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "i går" : `${days}d`;
}

/**
 * Emne-kategori pr. nyhed, udledt af overskriften – rene nøgleords-regler
 * (dansk + engelsk), tjekket i rækkefølge (mest specifikke først, så fx
 * "elbil" rammer batteri-reglen og ikke den generiske bil-fallback).
 * Ord-grænser (\b) bruges overalt, så korte ord som "bil" ikke falsk-rammer
 * inde i "mobil"/"automobil". Selve ikon-tegningen (liquid-glass badge, ikke
 * emoji) sker i news-section.tsx ud fra denne kategori.
 */
export type NewsCategory = "ev" | "fuel" | "phone" | "ai" | "computer" | "screen" | "watch" | "car" | "general";

// \w* som suffiks fanger danske bøjninger/sammensætninger frit
// ("elbilister", "ladestandere", "tankstationerne" ...) uden en fast liste.
const CATEGORY_RULES: { category: NewsCategory; pattern: RegExp }[] = [
  { category: "ev", pattern: /\b(elbil\w*|batteri\w*|ladestander\w*|charging|electric vehicle)\b/i },
  { category: "fuel", pattern: /\b(fossilbil\w*|benzin\w*|diesel\w*|tankstation\w*|petrol|gasoline|fuel)\b/i },
  { category: "phone", pattern: /\b(telefon\w*|iphone|smartphone\w*|android|mobiltelefon\w*)\b/i },
  { category: "ai", pattern: /\b(kunstig intelligens|\bai\b|chatgpt|gemini|copilot|robot\w*)\b/i },
  { category: "computer", pattern: /\b(laptop\w*|computer\w*|macbook\w*|\bpc\b)\b/i },
  { category: "screen", pattern: /\b(\btv\b|skærm\w*|fjernsyn\w*)\b/i },
  { category: "watch", pattern: /\b(smartwatch\w*|(smart)?ur(et|ene)?|watch\w*)\b/i },
  // "bil" er kort og tvetydigt (rammer "billeder", "bilag" osv. med \w*),
  // så her holdes en udtrykkelig bøjningsliste i stedet for et wildcard-suffiks.
  { category: "car", pattern: /\b(bil|biler|bilist\w*|bilbranchen|bilmærker|bilhandel|car|cars|automotive|tesla|toyota|bmw|audi|volvo)\b/i },
];

export function detectNewsCategory(title: string): NewsCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(title)) return rule.category;
  }
  return "general";
}
