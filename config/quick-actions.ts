import {
  Plus,
  Gavel,
  KeyRound,
  Wrench,
  ShieldAlert,
  CalendarPlus,
  ShoppingCart,
  NotebookPen,
  Home,
} from "lucide-react";

import type { QuickAction } from "@/components/dashboard/page-quick-actions";

/**
 * "Hurtige handlinger" – delt mellem Storgaard Biler-siden, Privat-siden og
 * forsidens dynamiske Hurtige handlinger-sektion (som skifter mellem de to
 * afhængigt af arbejdstid). Ét sted, så knapperne aldrig kan divergere.
 */

const KLARGOERING_NOTE = "LAGERBIL\n1. Teknisk gennemgang\n/ Lasse";

export const storgaardActions: QuickAction[] = [
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

export const privatActions: QuickAction[] = [
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
