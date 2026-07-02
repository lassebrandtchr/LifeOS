import { Newspaper } from "lucide-react";

import { timeAgo, type NewsItem } from "@/lib/news/types";

/**
 * Nyheder – forsidens Arbejdsoverblik-kort, højre halvdel. Skifter emne
 * dynamisk med arbejdstid: bilbranchen i arbejdstid, AI/tech/consumer
 * electronics (+ lidt bilnyt) uden for. Kilderne kommer fra Google News'
 * eget RSS-feed (lib/news/google-news.ts), så det pr. definition kun er
 * kilder Google selv finder troværdige nok til deres nyhedsfeed.
 */
export function NewsSection({ isWork, items }: { isWork: boolean; items: NewsItem[] }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Newspaper className="size-3.5" />
        {isWork ? "Nyheder fra bilverdenen" : "Nyheder fra tech- og AI-verdenen"}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen nyheder tilgængelige lige nu.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((n) => (
            <li key={n.url}>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="-mx-1.5 flex flex-col gap-0.5 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-secondary/50"
              >
                <span className="text-sm font-medium leading-snug text-foreground">{n.title}</span>
                <span className="text-xs text-muted-foreground">
                  {n.source}
                  {n.publishedAt && ` · ${timeAgo(n.publishedAt)}`}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
