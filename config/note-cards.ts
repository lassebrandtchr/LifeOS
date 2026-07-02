import {
  MessageCircle,
  Users,
  Lightbulb,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

import type { Workspace } from "@/features/tasks/constants";

/**
 * "Noter"-kasserne på Storgaard Biler-siden – et lille, Notion-inspireret
 * galleri af faste emner Lasse skriver løbende noter til (morgenmøder,
 * ugentlige møder, salgsprocesser, årsoversigt). Hver kasse har sit eget
 * "omslag" (farvet gradient + stort ikon, tegnet i CSS – ikke et foto, så
 * det matcher appens liquid-glass-look i stedet for at klaske et
 * stockfoto oveni). Titlen er den naturlige nøgle i `notes`-tabellen
 * (workspace + title), så der ikke skal en ny migration til.
 */
export type NoteCardTheme = {
  title: string;
  emoji: string;
  icon: LucideIcon;
  color: string;
  workspace: Workspace;
};

export const storgaardNoteCards: NoteCardTheme[] = [
  {
    title: "Ting til morgenmødet",
    emoji: "🗨️",
    icon: MessageCircle,
    color: "#34b3a4",
    workspace: "work",
  },
  {
    title: "Torsdag møde – værd at nævne",
    emoji: "👋",
    icon: Users,
    color: "#e6b15a",
    workspace: "work",
  },
  {
    title: "Vigtige processer i salg (import, huskeliste etc)",
    emoji: "💯",
    icon: Lightbulb,
    color: "#a78bfa",
    workspace: "work",
  },
  {
    title: "Møder 2026",
    emoji: "💬",
    icon: CalendarDays,
    color: "#4f8dff",
    workspace: "work",
  },
];
