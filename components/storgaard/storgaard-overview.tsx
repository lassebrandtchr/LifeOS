"use client";

import { motion, type Variants } from "framer-motion";
import { Car, BarChart3 } from "lucide-react";

import { SectionCard } from "@/components/dashboard/section-card";
import { PageQuickActions } from "@/components/dashboard/page-quick-actions";
import { UpcomingEvents, RecentMails } from "@/components/dashboard/mini-lists";
import { ActionList } from "@/components/dashboard/action-list";
import { NoteCards } from "@/components/storgaard/note-cards";
import { BarList } from "@/components/ui/chart";
import { storgaardActions } from "@/config/quick-actions";
import { storgaardNoteCards } from "@/config/note-cards";
import type { StorgaardStats } from "@/features/dashboard/stats";
import type { CalendarEventItem, MailMessage } from "@/features/integrations/types";
import type { ActionListGroups } from "@/features/dashboard/action-list";

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
  actionGroups,
  noteBodies,
}: {
  stats: StorgaardStats;
  events: CalendarEventItem[];
  mails: MailMessage[];
  actionGroups: ActionListGroups;
  noteBodies: Record<string, string>;
}) {
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

      {/* Action-liste – prioriteret, kombineret fra opgaver + Outlook-indbakke */}
      <ActionList groups={actionGroups} workspace="work" />

      {/* Noter – faste note-kasser (morgenmøde, ugemøde, salgsprocesser, årsoversigt) */}
      <NoteCards cards={storgaardNoteCards} initialBodies={noteBodies} />

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
