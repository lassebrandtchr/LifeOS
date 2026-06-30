/**
 * Register over LifeOS' AI-agenter (Fase 8).
 *
 * FASE 8: agenterne er IKKE autonome. De læser data og FORESLÅR – de udfører
 * ingen handlinger uden brugerens godkendelse. Chief of Staff er den centrale
 * koordinator; de øvrige dækker hver sit domæne. "Domain" styrer, hvilke data
 * en agent ræsonnerer ud fra.
 */

export type Domain =
  | "all"
  | "work"
  | "private"
  | "marketing"
  | "mail"
  | "calendar"
  | "memory"
  | "research"
  | "finance"
  | "health"
  | "education";

export type Agent = {
  id: string;
  name: string;
  emoji: string;
  domain: Domain;
  description: string;
  /** Er agentens domæne koblet på data endnu? (ellers "kommer snart"). */
  live: boolean;
};

export const agents: Agent[] = [
  { id: "chief-of-staff", name: "Chief of Staff", emoji: "🧠", domain: "all", live: true, description: "Dagens overblik, prioritering og fokus." },
  { id: "sales", name: "Sales AI", emoji: "🚗", domain: "work", live: true, description: "Storgaard Biler: kunder, leads og salg." },
  { id: "home", name: "Home AI", emoji: "🏠", domain: "private", live: true, description: "Tangevej 94, familie og hjemmet." },
  { id: "marketing", name: "Marketing AI", emoji: "🎬", domain: "marketing", live: true, description: "Sociale medier, video-idéer og content." },
  { id: "memory", name: "Memory AI", emoji: "🧠", domain: "memory", live: true, description: "Noter, viden og dit second brain." },
  { id: "mail", name: "Mail AI", emoji: "📬", domain: "mail", live: true, description: "Mails, prioritering og opfølgning." },
  { id: "calendar", name: "Calendar AI", emoji: "📅", domain: "calendar", live: true, description: "Kalender, tid og planlægning." },
  { id: "research", name: "Research AI", emoji: "🔍", domain: "research", live: false, description: "Analyse, trends og viden." },
  { id: "finance", name: "Finance AI", emoji: "💰", domain: "finance", live: false, description: "Privatøkonomi, budget og regninger." },
  { id: "health", name: "Health AI", emoji: "❤️", domain: "health", live: false, description: "Sundhed, træning og søvn." },
  { id: "education", name: "Education AI", emoji: "📚", domain: "education", live: false, description: "Læring, studier og noter." },
];

export const agentById = (id: string) => agents.find((a) => a.id === id);

/** Valgmuligheder i chat-dropdownen ("fokus"). Mapper til en agent/domæne. */
export type ChatScope = {
  id: string;
  label: string;
  domain: Domain;
};

export const chatScopes: ChatScope[] = [
  { id: "auto", label: "Automatisk", domain: "all" },
  { id: "chief-of-staff", label: "Chief of Staff", domain: "all" },
  { id: "private", label: "Privat", domain: "private" },
  { id: "work", label: "Storgaard Biler", domain: "work" },
  { id: "marketing", label: "Markedsføring", domain: "marketing" },
  { id: "mail", label: "Mail", domain: "mail" },
  { id: "calendar", label: "Kalender", domain: "calendar" },
  { id: "tangevej_94", label: "Tangevej 94", domain: "private" },
  { id: "memory", label: "Memory", domain: "memory" },
];

export const scopeById = (id: string) =>
  chatScopes.find((s) => s.id === id) ?? chatScopes[0];
