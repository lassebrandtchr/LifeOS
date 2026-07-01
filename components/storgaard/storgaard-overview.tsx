"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Car,
  Users,
  Tag,
  Megaphone,
  AlertTriangle,
  BarChart3,
  Plus,
  Gavel,
  KeyRound,
  Wrench,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import { SectionCard } from "@/components/dashboard/section-card";
import {
  PageQuickActions,
  type QuickAction,
} from "@/components/dashboard/page-quick-actions";
import { UpcomingEvents, RecentMails } from "@/components/dashboard/mini-lists";
import { WorkspaceTasks } from "@/components/dashboard/workspace-tasks";
import { BarList } from "@/components/ui/chart";
import type { StorgaardStats } from "@/features/dashboard/stats";
import type { CalendarEventItem, MailMessage } from "@/features/integrations/types";
import type { Task } from "@/features/tasks/types";

const KLARGOERING_NOTE = "LAGERBIL\n1. Teknisk gennemgang\n/ Lasse";

const storgaardActions: QuickAction[] = [
  { kind: "navigate", label: "Ny opgave", icon: Plus, color: "#4f8dff", href: "/opgaver" },
  {
    kind: "create-task",
    label: "Bud på bil",
    icon: Gavel,
    color: "#34b3a4",
    title: "Bud på bil",
    workspace: "work",
    category: "salg",
  },
  {
    kind: "new-event",
    label: "Aflevering af bil",
    icon: KeyRound,
    color: "#e6b15a",
    title: "Aflevering af bil",
    workspace: "work",
  },
  {
    kind: "create-task",
    label: "Teknisk/Kosmetisk klargøring",
    icon: Wrench,
    color: "#a78bfa",
    title: "Teknisk/Kosmetisk klargøring",
    workspace: "work",
    category: "administration",
    note: KLARGOERING_NOTE,
  },
  {
    kind: "create-task",
    label: "Reklamation",
    icon: ShieldAlert,
    color: "#e5484d",
    title: "Reklamation",
    workspace: "work",
    priority: "urgent",
  },
];

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const WORK = "var(--accent-work)";

export function StorgaardOverview({
  stats,
  events,
  mails,
  tasks,
}: {
  stats: StorgaardStats;
  events: CalendarEventItem[];
  mails: MailMessage[];
  tasks: Task[];
}) {
  const kpis: { label: string; value: number; icon: LucideIcon; color: string }[] = [
    { label: "Aktive leads", value: stats.leads, icon: Users, color: "var(--primary)" },
    { label: "Tilbud & finansiering", value: stats.tilbud, icon: Tag, color: "var(--accent-private)" },
    { label: "Markedsføring", value: stats.markedsfoering, icon: Megaphone, color: "var(--success)" },
    { label: "Forfaldne", value: stats.overdue, icon: AlertTriangle, color: "var(--destructive)" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in oklab, ${WORK} 16%, transparent)`, color: WORK }}
        >
          <Car className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Storgaard Biler</h1>
          <p className="text-sm text-muted-foreground">
            Dit arbejde – leads, salg, lager, finansiering og markedsføring.
          </p>
        </div>
      </div>

      {/* Hurtige handlinger */}
      <PageQuickActions actions={storgaardActions} />

      {/* Præcis opgaveliste – kun arbejdsopgaver */}
      <WorkspaceTasks tasks={tasks} workspace="work" />

      {/* KPI-fliser */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} variants={item}>
              <Link
                href="/opgaver"
                className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-card border border-border/70 bg-card p-5 shadow-soft transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft-lg"
              >
                <span
                  className="flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: `color-mix(in oklab, ${k.color} 14%, transparent)`, color: k.color }}
                >
                  <Icon className="size-5" />
                </span>
                <div>
                  <div className="text-3xl font-semibold tabular-nums leading-none">{k.value}</div>
                  <div className="mt-1.5 text-sm text-muted-foreground">{k.label}</div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Grafer */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3"
      >
        <motion.div variants={item} className="lg:col-span-3">
          <SectionCard title="Aktivitet pr. område" icon={BarChart3} href="/opgaver">
            {stats.byCategory.length === 0 ? (
              <Empty text="Ingen arbejdsopgaver endnu. Hent dem fra Notion eller opret en opgave." />
            ) : (
              <BarList
                items={stats.byCategory.map((c) => ({
                  label: c.label,
                  value: c.value,
                  emoji: c.emoji,
                  color: WORK,
                }))}
              />
            )}
          </SectionCard>
        </motion.div>

        {/* Arbejds-mail + arbejds-kalender samlet her */}
        <motion.div variants={item} className="lg:col-span-2">
          <UpcomingEvents events={events} />
        </motion.div>
        <motion.div variants={item}>
          <RecentMails mails={mails} />
        </motion.div>
      </motion.div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-8 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
