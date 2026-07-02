import {
  Newspaper,
  BatteryCharging,
  Fuel,
  Smartphone,
  Bot,
  Laptop,
  Tv,
  Watch,
  Car,
  type LucideIcon,
} from "lucide-react";

import { timeAgo, detectNewsCategory, type NewsCategory, type NewsItem } from "@/lib/news/types";

/**
 * Emne-badge pr. nyhed – et lille "liquid glass" ikon (samme glas-højlys +
 * farvet tint-teknik som headeren/TaskStrip), ikke en rå emoji-tegn.
 */
const CATEGORY_STYLE: Record<NewsCategory, { Icon: LucideIcon; color: string }> = {
  ev: { Icon: BatteryCharging, color: "#22c55e" },
  fuel: { Icon: Fuel, color: "#f59e0b" },
  phone: { Icon: Smartphone, color: "#38bdf8" },
  ai: { Icon: Bot, color: "#a78bfa" },
  computer: { Icon: Laptop, color: "#64748b" },
  screen: { Icon: Tv, color: "#f472b6" },
  watch: { Icon: Watch, color: "#fb923c" },
  car: { Icon: Car, color: "#0ea5e9" },
  general: { Icon: Newspaper, color: "#94a3b8" },
};

function NewsIconBadge({ title }: { title: string }) {
  const { Icon, color } = CATEGORY_STYLE[detectNewsCategory(title)];
  return (
    <span
      aria-hidden
      className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 backdrop-blur-sm"
      style={{
        backgroundImage: `radial-gradient(120% 120% at 30% 20%, color-mix(in oklab, ${color} 55%, transparent), color-mix(in oklab, ${color} 18%, transparent))`,
      }}
    >
      <Icon className="size-3.5" style={{ color }} strokeWidth={2.25} />
      {/* glas-højlys, samme mønster som "Godformiddag"-kassen */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.4), transparent 55%)" }}
      />
    </span>
  );
}

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
                className="-mx-1.5 flex items-start gap-2 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-secondary/50"
              >
                <NewsIconBadge title={n.title} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium leading-snug text-foreground">{n.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {n.source}
                    {n.publishedAt && ` · ${timeAgo(n.publishedAt)}`}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
