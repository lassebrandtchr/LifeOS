import {
  Home,
  User,
  Car,
  Mail,
  Calendar,
  CheckSquare,
  Clapperboard,
  BrainCircuit,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Sidebar-navigation for LifeOS.
 * Alle labels er på dansk (hård regel). Ruterne (href) er engelske/url-venlige.
 * Emoji'erne matcher Lasses ønske – de vises ved siden af ikonet i mobilmenuen.
 */
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  emoji: string;
};

export const mainNav: NavItem[] = [
  { label: "Forside", href: "/", icon: Home, emoji: "🏠" },
  { label: "Privat", href: "/privat", icon: User, emoji: "👤" },
  { label: "Storgaard Biler", href: "/storgaard-biler", icon: Car, emoji: "🚗" },
  { label: "Mail", href: "/mail", icon: Mail, emoji: "📬" },
  { label: "Kalender", href: "/kalender", icon: Calendar, emoji: "📅" },
  { label: "Opgaver", href: "/opgaver", icon: CheckSquare, emoji: "✅" },
  {
    label: "Markedsføring",
    href: "/markedsfoering",
    icon: Clapperboard,
    emoji: "🎬",
  },
  {
    label: "AI-assistenter",
    href: "/ai-assistenter",
    icon: BrainCircuit,
    emoji: "🧠",
  },
  { label: "Indstillinger", href: "/indstillinger", icon: Settings, emoji: "⚙️" },
];

/** De vigtigste punkter til bund-tab-baren på mobil. */
export const mobileNav: NavItem[] = [
  mainNav[0], // Forside
  mainNav[1], // Privat
  mainNav[2], // Storgaard Biler
  mainNav[7], // AI-assistenter
];
