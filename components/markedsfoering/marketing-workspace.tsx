"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, Megaphone, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DashboardTab } from "@/components/markedsfoering/tabs/dashboard-tab";
import { CalendarTab } from "@/components/markedsfoering/tabs/calendar-tab";
import { TasksTab } from "@/components/markedsfoering/tabs/tasks-tab";
import { CampaignsTab } from "@/components/markedsfoering/tabs/campaigns-tab";
import { IdeabankTab } from "@/components/markedsfoering/tabs/ideabank-tab";
import { WikiTab } from "@/components/markedsfoering/tabs/wiki-tab";
import { MediaTab } from "@/components/markedsfoering/tabs/media-tab";
import { ChecklistsTab } from "@/components/markedsfoering/tabs/checklists-tab";
import type { MarketingWorkspaceData } from "@/features/marketing/types";

/**
 * Marketing Workspace – marketingafdelingens daglige arbejdsplads (Fase 10).
 *
 * Bygget OVENPÅ den eksisterende /markedsfoering-rute (ingen navigation/layout
 * ændret). Faner i samme stil som Opgaver-siden. 100% regelbaseret – ingen AI
 * nødvendig; AI kan kobles på senere som supplement.
 */

export type MarketingTab =
  | "dashboard"
  | "kalender"
  | "opgaver"
  | "kampagner"
  | "idebank"
  | "wiki"
  | "medier"
  | "checklister";

const tabs: { id: MarketingTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "opgaver", label: "Opgaver" },
  { id: "kalender", label: "Kalender" },
  { id: "kampagner", label: "Kampagner" },
  { id: "idebank", label: "Idébank" },
  { id: "checklister", label: "Checklister" },
  { id: "wiki", label: "Wiki" },
  { id: "medier", label: "Medier" },
];

export function MarketingWorkspace({ data }: { data: MarketingWorkspaceData }) {
  const [tab, setTab] = React.useState<MarketingTab>("dashboard");
  const [spawn, setSpawn] = React.useState<{ tab: MarketingTab; preset?: { type?: string }; nonce: number } | null>(null);
  const [query, setQuery] = React.useState("");

  const go = React.useCallback((t: MarketingTab, preset?: { type?: string }) => {
    setQuery("");
    setSpawn({ tab: t, preset, nonce: Date.now() });
    setTab(t);
  }, []);

  // autoCreate gælder kun den fane vi netop hoppede til via en hurtig handling.
  const auto = (t: MarketingTab) => spawn?.tab === t;
  const presetType = spawn?.preset?.type;

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: "color-mix(in oklab, var(--brand) 16%, transparent)", color: "var(--brand)" }}
          >
            <span aria-hidden className="text-xl">🎬</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
            <p className="text-sm text-muted-foreground">Din daglige marketing-arbejdsplads for Storgaard Biler.</p>
          </div>
        </div>

        {/* Global søgning */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg i marketing …"
            className="pl-9 pr-9"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Ryd" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Faner */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setQuery(""); setTab(t.id); }}
            className={cn(
              "relative isolate flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id && !searching ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === t.id && !searching && (
              <motion.span layoutId="marketing-tab" className="absolute inset-0 -z-10 rounded-lg bg-primary shadow-glow" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
            )}
            {t.label}
          </button>
        ))}
      </div>

      {/* Indhold */}
      {searching ? (
        <SearchResults data={data} query={q} onOpen={(t) => setTab(t)} clear={() => setQuery("")} />
      ) : (
        <>
          {tab === "dashboard" && <DashboardTab data={data} go={go} />}
          {tab === "opgaver" && <TasksTab tasks={data.tasks} autoCreate={auto("opgaver")} />}
          {tab === "kalender" && <CalendarTab events={data.events} campaigns={data.campaigns} autoCreate={auto("kalender")} presetType={presetType} />}
          {tab === "kampagner" && <CampaignsTab campaigns={data.campaigns} tasks={data.tasks} autoCreate={auto("kampagner")} />}
          {tab === "idebank" && <IdeabankTab ideas={data.ideas} autoCreate={auto("idebank")} />}
          {tab === "checklister" && <ChecklistsTab checklists={data.checklists} templates={data.templates} autoCreate={auto("checklister")} />}
          {tab === "wiki" && <WikiTab wiki={data.wiki} autoCreate={auto("wiki")} />}
          {tab === "medier" && <MediaTab media={data.media} campaigns={data.campaigns} autoCreate={auto("medier")} presetType={presetType} />}
        </>
      )}
    </div>
  );
}

// ───────────────────────────── Global søgning ───────────────────────────
type Hit = { id: string; title: string; type: string; tab: MarketingTab };

function SearchResults({
  data,
  query,
  onOpen,
  clear,
}: {
  data: MarketingWorkspaceData;
  query: string;
  onOpen: (t: MarketingTab) => void;
  clear: () => void;
}) {
  const match = (s: string | null | undefined) => (s ?? "").toLowerCase().includes(query);

  const hits: Hit[] = [];
  for (const c of data.campaigns) if (match(c.name) || match(c.description)) hits.push({ id: c.id, title: c.name, type: "Kampagne", tab: "kampagner" });
  for (const t of data.tasks) if (match(t.title)) hits.push({ id: t.id, title: t.title, type: "Opgave", tab: "opgaver" });
  for (const i of data.ideas) if (match(i.title) || match(i.body) || i.tags.some((tag) => tag.toLowerCase().includes(query))) hits.push({ id: i.id, title: i.title, type: "Idé", tab: "idebank" });
  for (const w of data.wiki) if (match(w.title) || match(w.body)) hits.push({ id: w.id, title: w.title, type: "Wiki", tab: "wiki" });
  for (const m of data.media) if (match(m.title) || m.tags.some((tag) => tag.toLowerCase().includes(query))) hits.push({ id: m.id, title: m.title, type: "Medie", tab: "medier" });
  for (const cl of data.checklists) if (match(cl.name)) hits.push({ id: cl.id, title: cl.name, type: "Checkliste", tab: "checklister" });
  for (const e of data.events) if (match(e.title)) hits.push({ id: e.id, title: e.title, type: "Kalender", tab: "kalender" });

  if (hits.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Search className="size-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Ingen marketing-resultater for “{query}”.</p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border/50 px-4 py-1">
      {hits.map((h) => (
        <button
          key={`${h.tab}-${h.id}`}
          onClick={() => { onOpen(h.tab); clear(); }}
          className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-secondary/30"
        >
          <Megaphone className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{h.title}</span>
          <Badge variant="secondary" className="shrink-0">{h.type}</Badge>
        </button>
      ))}
    </Card>
  );
}
