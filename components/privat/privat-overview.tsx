"use client";

import { User } from "lucide-react";

import { PageQuickActions } from "@/components/dashboard/page-quick-actions";
import { UpcomingEvents, RecentMails } from "@/components/dashboard/mini-lists";
import { ActionList } from "@/components/dashboard/action-list";
import { privatActions } from "@/config/quick-actions";
import type { CalendarEventItem, MailMessage } from "@/features/integrations/types";
import type { ActionListGroups } from "@/features/dashboard/action-list";

const PRIVATE = "var(--accent-private)";

export function PrivatOverview({
  events,
  mails,
  actionGroups,
}: {
  events: CalendarEventItem[];
  mails: MailMessage[];
  actionGroups: ActionListGroups;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in oklab, ${PRIVATE} 16%, transparent)`, color: PRIVATE }}
        >
          <User className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Privat</h1>
          <p className="text-sm text-muted-foreground">
            Dit privatliv – familie, hus, økonomi og Tangevej 94.
          </p>
        </div>
      </div>

      {/* Hurtige handlinger */}
      <PageQuickActions actions={privatActions} />

      {/* Action-liste – prioriteret, kombineret fra opgaver + Gmail-indbakke */}
      <ActionList groups={actionGroups} workspace="private" />

      {/* Privat kalender + privat mail samlet her */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingEvents events={events} />
        </div>
        <RecentMails mails={mails} />
      </div>
    </div>
  );
}
