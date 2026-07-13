import {
  Plus,
  Gavel,
  Globe,
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

// Noten gemmes som rich-text (HTML), så den kommer PÆNT formateret ud af sig
// selv når man opretter en importbil-opgave: fed + lidt større overskrift, og
// et tomt afsnit mellem hvert punkt for luft/læsbarhed (matcher Lasses billede).
// Fed = <strong>, større = font-size-marken (<span style="font-size:…">),
// tomme <p></p> = blank linje. Ændres formatet i editoren, så følg samme HTML.
const IMPORT_BIL_NOTE = [
  `<p><strong><span style="font-size: 20px">Importbil – Ønskeliste Storgaard Biler.</span></strong></p>`,
  `<p></p>`,
  `<p>1. Mærke og model (Fx Tesla Model 3, VW ID.4, BMW iX3)</p>`,
  `<p></p>`,
  `<p>2. Årgang (Fx "fra 2021 og frem")</p>`,
  `<p></p>`,
  `<p>3. Farveønsker (Fx "sort, hvid eller koksgrå – ikke blå eller rød")</p>`,
  `<p></p>`,
  `<p>4. Prisbudget (DKK) =</p>`,
  `<p></p>`,
  `<p>5. Maks. kilometer (Fx 50–70.000 km)</p>`,
  `<p></p>`,
  `<p>6. Ønsket udstyr (Fx varmepumpe, adaptiv fartpilot, anhængertræk, panorama tag osv.)</p>`,
  `<p></p>`,
  `<p>7. Andre krav (Fx kun Long Range, kun EU-bil, servicehistorik, ikke-ryger, momsstatus, garanti osv.)</p>`,
  `<p></p>`,
  `<p>8. Ting du gerne vil undgå (Fx bestemte farver, tidligere udlejningsbil, uden garanti osv.)</p>`,
].join("");

export const storgaardActions: QuickAction[] = [
  {
    kind: "create-task",
    label: "Ny opgave",
    icon: Plus,
    color: "#4f8dff",
    title: "Ny opgave",
    workspace: "work",
  },
  {
    kind: "create-task",
    label: "Bud på bil",
    icon: Gavel,
    color: "#34b3a4",
    title: "Bud på bil",
    workspace: "work",
    category: "salg",
    priority: "important",
    status: "in_progress",
  },
  {
    kind: "create-task",
    label: "Import af bil",
    icon: Globe,
    color: "#e6b15a",
    title: "Import af bil",
    workspace: "work",
    category: "salg",
    // Importbiler starter som "kan vente" og lander dermed nederst i
    // Action-listen (Lasses ønske). Det er nu en STANDARDVÆRDI, ikke en
    // tvang: ændrer man prioriteten på opgaven bagefter, flytter den sig
    // rent faktisk op i listen (før blev valget overskrevet hver gang
    // listen blev bygget – se features/dashboard/action-list.ts).
    priority: "can_wait",
    status: "in_progress",
    note: IMPORT_BIL_NOTE,
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
  {
    kind: "create-task",
    label: "Ny opgave",
    icon: Plus,
    color: "#4f8dff",
    title: "Ny opgave",
    workspace: "private",
  },
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
