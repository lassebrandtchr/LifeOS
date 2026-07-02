"use client";

import * as React from "react";
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
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { timeAgo, detectNewsCategory, type NewsCategory, type NewsItem } from "@/lib/news/types";
import { refreshNews } from "@/features/dashboard/news-actions";

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
 *
 * "Opdater"-knappen henter friske nyheder uden om den normale 6-timers-
 * cache, og prøver at undgå at vise de samme historier igen.
 */
export function NewsSection({ isWork, items }: { isWork: boolean; items: NewsItem[] }) {
  const [shown, setShown] = React.useState(items);
  const [refreshing, setRefreshing] = React.useState(false);

  // Server-leverede "items" kan ændre sig udefra (fx arbejde/privat skifter
  // automatisk ved arbejdstid) – deriveret state (ikke en effekt), så vores
  // egen "Opdater"-liste ikke forsvinder ved re-render, men STADIG følger
  // med når det reelt er en ny prop (ikke vores egen setShown-runde).
  const [prevItems, setPrevItems] = React.useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setShown(items);
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await refreshNews(isWork, shown.map((n) => n.url));
      if (fresh.length === 0) {
        // Kilderne har reelt ikke noget andet at byde på lige nu inden for
        // 7-dages-grænsen – behold den nuværende liste i stedet for at vise
        // en tom kasse, og sig det ærligt frem for at genvise det samme.
        toast.info("Ingen nye historier lige nu – prøv igen om lidt.");
        return;
      }
      setShown(fresh);
    } catch {
      toast.error("Kunne ikke hente nye nyheder.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Newspaper className="size-3.5" />
          {isWork ? "Nyheder fra bilverdenen" : "Nyheder fra tech- og AI-verdenen"}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Opdater nyheder"
          title="Hent andre nyheder"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} />
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen nyheder tilgængelige lige nu.</p>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((n) => (
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
