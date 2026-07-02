"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  CalendarClock,
  CalendarRange,
  AlertTriangle,
  Flame,
  PieChart,
  TrendingUp,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/dashboard/section-card";
import { DonutChart, AreaChart, BarList } from "@/components/ui/chart";
import type { DashboardStats } from "@/features/dashboard/stats";
import type { Priority } from "@/features/tasks/constants";

const tile: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ───────────────────────────── KPI-fliser ────────────────────────────────
type Kpi = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  tint: string;
};

export function KpiTiles({ stats }: { stats: DashboardStats }) {
  const kpis: Kpi[] = [
    { label: "I dag", value: stats.today, icon: CalendarClock, color: "var(--primary)", tint: "color-mix(in oklab, var(--primary) 14%, transparent)" },
    { label: "Denne uge", value: stats.week, icon: CalendarRange, color: "var(--accent-private)", tint: "color-mix(in oklab, var(--accent-private) 14%, transparent)" },
    { label: "Forfaldne", value: stats.overdue, icon: AlertTriangle, color: "var(--destructive)", tint: "color-mix(in oklab, var(--destructive) 14%, transparent)" },
    { label: "Haster", value: stats.urgent, icon: Flame, color: "var(--warning)", tint: "color-mix(in oklab, var(--warning) 14%, transparent)" },
  ];

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <motion.div key={k.label} variants={tile}>
            <Link
              href="/opgaver"
              className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-card border border-border/70 bg-card p-5 shadow-soft transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft-lg"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: k.tint, color: k.color }}
                >
                  <Icon className="size-5" />
                </span>
              </div>
              <div>
                <div className="text-3xl font-semibold tabular-nums leading-none">
                  {k.value}
                </div>
                <div className="mt-1.5 text-sm text-muted-foreground">{k.label}</div>
              </div>
              <div
                aria-hidden
                className="absolute -right-6 -top-8 size-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ backgroundColor: k.tint }}
              />
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ───────────────────────── Verden-fordeling (donut) ──────────────────────
export function WorldSplitCard({ stats }: { stats: DashboardStats }) {
  const total = stats.activeWork + stats.activePrivate;
  return (
    <SectionCard title="Åbne opgaver pr. verden" icon={PieChart} href="/opgaver">
      {total === 0 ? (
        <EmptyChart text="Ingen åbne opgaver lige nu 🎉" />
      ) : (
        <DonutChart
          centerValue={total}
          centerLabel="åbne"
          data={[
            { label: "Storgaard Biler", value: stats.activeWork, color: "var(--accent-work)" },
            { label: "Privat", value: stats.activePrivate, color: "var(--accent-private)" },
          ]}
        />
      )}
    </SectionCard>
  );
}

// ─────────────────────── Færdige sidste 7 dage (area) ─────────────────────
export function CompletedTrendCard({ stats }: { stats: DashboardStats }) {
  const total7 = stats.completed7.reduce((s, p) => s + p.value, 0);
  return (
    <SectionCard title="Færdige opgaver" icon={TrendingUp} href="/opgaver">
      <div className="flex flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{total7}</span>
          <span className="text-sm text-muted-foreground">sidste 7 dage</span>
        </div>
        <div className="mt-auto pt-4">
          <AreaChart points={stats.completed7} color="var(--success)" />
        </div>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────── Prioritet (bjælker) ─────────────────────────
const priorityColor: Record<Priority, string> = {
  urgent: "var(--destructive)",
  important: "var(--warning)",
  can_wait: "var(--success)",
};

export function PriorityCard({ stats }: { stats: DashboardStats }) {
  const items = stats.byPriority.map((p) => ({
    label: p.label,
    value: p.count,
    color: priorityColor[p.priority],
  }));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <SectionCard title="Fordeling efter prioritet" icon={ListChecks} href="/opgaver">
      {total === 0 ? (
        <EmptyChart text="Ingen åbne opgaver at prioritere." />
      ) : (
        <BarList items={items} />
      )}
    </SectionCard>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className={cn("flex flex-1 items-center justify-center py-8 text-center")}>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
