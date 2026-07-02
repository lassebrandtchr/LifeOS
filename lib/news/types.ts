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
