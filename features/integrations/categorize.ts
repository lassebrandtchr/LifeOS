/**
 * Mail-kategorisering (Fase 9).
 *
 * REGELBASERET (ligesom opgave-parseren) – ingen LLM. Den er den fælles kilde
 * til sandhed for:
 *   1) hvilke kategorier findes (+ dansk label + farve i UI),
 *   2) hvilken Gmail-label hver kategori spejles til,
 *   3) hvordan en mail kategoriseres ud fra afsender/emne/uddrag.
 *
 * Gmail-labels lægges under et fælles "LifeOS/"-præfiks, så de er nemme at
 * kende (og slette igen) i din Gmail.
 */

export type MailCategoryId =
  | "kunde"
  | "faktura"
  | "levering"
  | "kvittering"
  | "nyhedsbrev";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "outline";

export type MailCategory = {
  id: MailCategoryId;
  label: string;
  /** Lasses EGEN Gmail-label, som kategorien spejles til (hans eget system). */
  gmailLabel: string;
  /** Gmail-label-ID (til API'et). */
  gmailLabelId: string;
  variant: BadgeVariant;
};

export const MAIL_CATEGORIES: MailCategory[] = [
  { id: "kunde", label: "Kunde", gmailLabel: "Arbejde", gmailLabelId: "Label_30", variant: "default" },
  { id: "faktura", label: "Faktura", gmailLabel: "Kvitteringer/fakturaer", gmailLabelId: "Label_6851695715860460098", variant: "warning" },
  { id: "levering", label: "Levering", gmailLabel: "Levering", gmailLabelId: "Label_37", variant: "secondary" },
  { id: "kvittering", label: "Kvittering", gmailLabel: "Ordrebekræftelser", gmailLabelId: "Label_2851542335419264115", variant: "secondary" },
  { id: "nyhedsbrev", label: "Nyhedsbrev", gmailLabel: "Nyhedsbrev", gmailLabelId: "Label_29", variant: "outline" },
];

export const categoryById = (id: string | null): MailCategory | undefined =>
  MAIL_CATEGORIES.find((c) => c.id === id);

/** Afsender-domæner der altid regnes som kunder (Storgaard-relaterede samarbejder). */
const CLIENT_DOMAINS = ["emcare.dk"];

/**
 * Kategoriserer en mail. Rækkefølgen er bevidst: kunde → faktura → levering →
 * kvittering → nyhedsbrev. (Fx "din ordre er leveret" = levering, ikke kvittering.)
 * Returnerer null hvis intet matcher (så får mailen ingen kategori).
 */
export function categorizeEmail(input: {
  from: string;
  subject?: string | null;
  snippet?: string | null;
}): MailCategoryId | null {
  const from = (input.from ?? "").toLowerCase();
  const domain = from.split("@")[1] ?? "";
  const text = `${input.subject ?? ""} ${input.snippet ?? ""}`.toLowerCase();

  if (CLIENT_DOMAINS.some((d) => domain.includes(d))) return "kunde";
  if (/regning|faktura|invoice|opkræv|betaling|mobilepay/.test(text))
    return "faktura";
  if (/leveret|delivered|afsendt|shipment|forsendelse|tracking|yunexpress/.test(text))
    return "levering";
  if (/ordrebekræft|kvittering|receipt|booking|billet|ticket|din ordre|your order|ordre|order/.test(text))
    return "kvittering";
  if (
    /nyhedsbrev|newsletter|unsubscribe|afmeld|level up your content/.test(text) ||
    /kajabimail|insideapple|apple\.com|facebookmail|meta/.test(from)
  )
    return "nyhedsbrev";

  return null;
}
