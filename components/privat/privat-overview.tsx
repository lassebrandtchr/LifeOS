"use client";

import { User, Plus, CalendarPlus, ShoppingCart, NotebookPen, Home } from "lucide-react";

import {
  PageQuickActions,
  type QuickAction,
} from "@/components/dashboard/page-quick-actions";
import { UpcomingEvents, RecentMails } from "@/components/dashboard/mini-lists";
import type { CalendarEventItem, MailMessage } from "@/features/integrations/types";

const PRIVATE = "var(--accent-private)";

const privatActions: QuickAction[] = [
  { kind: "navigate", label: "Ny opgave", icon: Plus, color: "#4f8dff", href: "/opgaver" },
  { kind: "new-event", label: "Ny aftale", icon: CalendarPlus, color: "#34b3a4", title: "", workspace: "private" },
  {
    kind: "create-task",
    label: "Indkøb",
    icon: ShoppingCart,
    color: "#e6b15a",
    title: "Indkøb",
    workspace: "private",
    category: "indkoeb",
  },
  {
    kind: "create-task",
    label: "Tangevej 94",
    icon: Home,
    color: "#a78bfa",
    title: "Tangevej 94",
    workspace: "private",
    category: "tangevej_94",
  },
  { kind: "navigate", label: "Ny note", icon: NotebookPen, color: "#f472b6", href: "/opgaver" },
];

export function PrivatOverview({
  events,
  mails,
}: {
  events: CalendarEventItem[];
  mails: MailMessage[];
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
