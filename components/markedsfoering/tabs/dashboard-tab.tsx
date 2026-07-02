"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Plus, Megaphone, Lightbulb, Film, Image as ImageIcon, CalendarPlus, Video,
  Inbox as InboxIcon, Zap, TrendingUp, CalendarDays, AlertTriangle, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { BarList } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { quickCreateTask } from "@/features/tasks/actions";
import { priorities } from "@/features/tasks/constants";
import { campaignStatuses, eventTypes, type CampaignStatus, type MarketingEventType } from "@/features/marketing/constants";
import type { MarketingWorkspaceData } from "@/features/marketing/types";
import type { MarketingTab } from "@/components/markedsfoering/marketing-workspace";

const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

type QA = { label: string; icon: LucideIcon; color: string; run: () => void };

export function DashboardTab({
  data,
  go,
}: {
  data: MarketingWorkspaceData;
  go: (tab: MarketingTab, preset?: { type?: string }) => void;
}) {
  const router = useRouter();

  function newTask() {
    quickCreateTask({ title: "Ny marketingopgave", workspace: "work", category: "markedsfoering" }).then((res) => {
      if (res?.error || !res?.id) { toast.error(res?.error ?? "Kunne ikke oprette."); return; }
      router.push(`/opgaver?aaben=${res.id}`);
    });
  }

  const quickActions: QA[] = [
    { label: "Ny marketingopgave", icon: Plus, color: "#4f8dff", run: newTask },
    { label: "Ny kampagne", icon: Megaphone, color: "#a78bfa", run: () => go("kampagner", { type: "new" }) },
    { label: "Ny idé", icon: Lightbulb, color: "#e6b15a", run: () => go("idebank", { type: "new" }) },
    { label: "Nyt opslag", icon: Film, color: "#34b3a4", run: () => go("kalender", { type: "opslag" }) },
    { label: "Ny video", icon: Video, color: "#e5484d", run: () => go("kalender", { type: "video" }) },
    { label: "Upload billede", icon: ImageIcon, color: "#ec4899", run: () => go("medier", { type: "billede" }) },
    { label: "Upload video", icon: CalendarPlus, color: "#10b981", run: () => go("medier", { type: "video" }) },
  ];

  const { kpis, inbox, tasks, events, campaigns } = data;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Copenhagen" });

  const active = tasks.filter((t) => t.status !== "done" && t.status !== "archived");
  const focus = {
    urgent: active.filter((t) => t.priority === "urgent"),
    today: active.filter((t) => t.bucket === "today"),
    week: active.filter((t) => t.bucket === "week"),
    later: active.filter((t) => t.bucket === "later"),
  };
  const upcomingEvents = [...events]
    .filter((e) => !e.done && e.event_date.slice(0, 10) >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 5);
  const activeCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "planned").slice(0, 5);

  const kpiBars = [
    { label: "Videoer", value: kpis.videos, color: "#e5484d", emoji: "📹" },
    { label: "Opslag publiceret", value: kpis.postsPublished, color: "#4f8dff", emoji: "📸" },
    { label: "Aktive kampagner", value: kpis.activeCampaigns, color: "#a78bfa", emoji: "🚀" },
    { label: "Idéer", value: kpis.ideas, color: "#e6b15a", emoji: "💡" },
    { label: "Opgaver færdige", value: kpis.tasksDone, color: "#10b981", emoji: "✅" },
  ];

  return (
    <div className="space-y-6">
      {/* Hurtige handlinger */}
      <SectionCard title="Hurtige handlinger" icon={Zap}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                type="button"
                onClick={qa.run}
                className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-center transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:bg-secondary hover:shadow-soft"
              >
                <span
                  className="flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `color-mix(in oklab, ${qa.color} 16%, transparent)`, color: qa.color }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-medium leading-tight">{qa.label}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Dagens marketingfokus */}
        <motion.div variants={item} className="lg:col-span-2">
          <SectionCard title="Dagens marketingfokus" icon={TrendingUp} href="/markedsfoering">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FocusTile label="🔴 Haster" count={focus.urgent.length} tone="text-destructive" />
              <FocusTile label="📅 I dag" count={focus.today.length} tone="text-primary" />
              <FocusTile label="🗓️ Denne uge" count={focus.week.length} tone="text-foreground" />
              <FocusTile label="🟢 Kan vente" count={focus.later.length} tone="text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-1.5">
              {focus.urgent.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <span className={cn("size-2 rounded-full", priorities[t.priority].dot)} />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
              {active.length === 0 && <p className="text-sm text-muted-foreground">Ingen aktive marketingopgaver lige nu.</p>}
            </div>
          </SectionCard>
        </motion.div>

        {/* Marketing inbox */}
        <motion.div variants={item}>
          <SectionCard title="Marketing inbox" icon={InboxIcon}>
            {inbox.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Alt er under kontrol – intet haster. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {inbox.map((i) => (
                  <li key={i.id} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className={cn("mt-0.5 size-3.5 shrink-0", toneColor(i.tone))} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.title}</p>
                      <p className="text-xs text-muted-foreground">{i.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </motion.div>

        {/* KPI */}
        <motion.div variants={item} className="lg:col-span-2">
          <SectionCard title="Marketing KPI" icon={TrendingUp}>
            <BarList items={kpiBars} />
          </SectionCard>
        </motion.div>

        {/* Kommende opslag */}
        <motion.div variants={item}>
          <SectionCard title="Kommende opslag" icon={CalendarDays} href="/markedsfoering">
            {upcomingEvents.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Ingen planlagte begivenheder.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {upcomingEvents.map((e) => {
                  const t = eventTypes[e.type as MarketingEventType] ?? eventTypes.opslag;
                  return (
                    <li key={e.id} className="flex items-center gap-2.5 py-2 text-sm">
                      <span aria-hidden>{t.emoji}</span>
                      <span className="min-w-0 flex-1 truncate">{e.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{e.event_date.slice(5, 10)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </motion.div>

        {/* Aktive kampagner */}
        <motion.div variants={item} className="lg:col-span-3">
          <SectionCard title="Kampagner" icon={Megaphone} href="/markedsfoering">
            {activeCampaigns.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Ingen kampagner endnu.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activeCampaigns.map((c) => {
                  const st = campaignStatuses[c.status as CampaignStatus] ?? campaignStatuses.planned;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5">
                      <span className="min-w-0 truncate text-sm font-medium">{c.name}</span>
                      <Badge variant="secondary" className="shrink-0">{st.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FocusTile({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-center">
      <p className={cn("text-2xl font-semibold tabular-nums", tone)}>{count}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function toneColor(tone: "danger" | "warning" | "primary" | "neutral") {
  return tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : tone === "primary" ? "text-primary" : "text-muted-foreground";
}
