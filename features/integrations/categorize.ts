/**
 * Mail-kategorisering (Fase 9).
 *
 * REGELBASERET (ligesom opgave-parseren) – ingen LLM. Den er den fælles kilde
 * til sandhed for:
 *   1) hvilke kategorier findes (+ dansk label + farve i UI),
 *   2) hvilken Gmail-label hver kategori spejles til,
 *   3) hvordan en mail kategoriseres ud fra afsender/emne/uddrag.
 *
 * Gmail-labels lægges under et fælles "AIOS/"-præfiks, så de er nemme at
 * kende (og slette igen) i din Gmail.
 */

export type MailCategoryId =
  | "kunde"
  | "bilvurdering"
  | "faktura"
  | "levering"
  | "kvittering"
  | "sikkerhed"
  | "kalender"
  | "reklame"
  | "nyhedsbrev"
  | "andet";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "outline";

export type MailCategory = {
  id: MailCategoryId;
  label: string;
  /** AIOS' egen Gmail-label, som kategorien spejles til. */
  gmailLabel: string;
  /** Legacy Gmail-label-ID fra den første version af appen. */
  gmailLabelId: string;
  variant: BadgeVariant;
};

export const MAIL_CATEGORIES: MailCategory[] = [
  { id: "kunde", label: "Kunde", gmailLabel: "AIOS/Kunde", gmailLabelId: "", variant: "default" },
  { id: "bilvurdering", label: "Bilvurdering", gmailLabel: "AIOS/Bilvurdering", gmailLabelId: "", variant: "default" },
  { id: "faktura", label: "Faktura", gmailLabel: "AIOS/Faktura", gmailLabelId: "", variant: "warning" },
  { id: "levering", label: "Levering", gmailLabel: "AIOS/Levering", gmailLabelId: "", variant: "secondary" },
  { id: "kvittering", label: "Kvittering", gmailLabel: "AIOS/Kvittering", gmailLabelId: "", variant: "secondary" },
  { id: "sikkerhed", label: "Sikkerhed", gmailLabel: "AIOS/Sikkerhed", gmailLabelId: "", variant: "warning" },
  { id: "kalender", label: "Kalender", gmailLabel: "AIOS/Kalender", gmailLabelId: "", variant: "secondary" },
  { id: "reklame", label: "Reklame", gmailLabel: "AIOS/Reklame", gmailLabelId: "", variant: "outline" },
  { id: "nyhedsbrev", label: "Nyhedsbrev", gmailLabel: "AIOS/Nyhedsbrev", gmailLabelId: "", variant: "outline" },
  { id: "andet", label: "Andet", gmailLabel: "AIOS/Andet", gmailLabelId: "", variant: "secondary" },
];

export const categoryById = (id: string | null): MailCategory | undefined =>
  MAIL_CATEGORIES.find((c) => c.id === id);

/** Afsender-domæner der altid regnes som kunder (Storgaard-relaterede samarbejder). */
const CLIENT_DOMAINS = ["emcare.dk"];

// ─────────────── Gmail-labels → LifeOS-kategori (STÆRKESTE signal) ──────────
// Lasses EGNE Gmail-labels (og Gmails egne kategorier) er "grundsandheden":
// har Gmail allerede sat en label, vi kender, så bruger vi DEN i stedet for at
// gætte ud fra teksten. Det er dét, der giver høj træfsikkerhed.

/** Gmails indbyggede kategori-labels → vores kategori. */
const GMAIL_SYSTEM_LABELS: Record<string, MailCategoryId> = {
  CATEGORY_PROMOTIONS: "reklame",
  CATEGORY_FORUMS: "nyhedsbrev",
};

/** Legacy-labels fra den første version af appen. Nye AIOS-labels får id dynamisk. */
const OWN_LABEL_TO_CATEGORY: Record<string, MailCategoryId> = {
  Label_30: "kunde",
  Label_6851695715860460098: "faktura",
  Label_37: "levering",
  Label_2851542335419264115: "kvittering",
  Label_29: "nyhedsbrev",
};

/**
 * Kategori ud fra beskedens Gmail-labels. Lasses egne labels vinder over Gmails
 * systemkategorier. Returnerer null, hvis ingen kendt label er sat.
 */
export function categoryFromGmailLabels(labelIds: string[] | undefined): MailCategoryId | null {
  if (!labelIds || labelIds.length === 0) return null;
  for (const id of labelIds) {
    if (OWN_LABEL_TO_CATEGORY[id]) return OWN_LABEL_TO_CATEGORY[id];
  }
  for (const id of labelIds) {
    if (GMAIL_SYSTEM_LABELS[id]) return GMAIL_SYSTEM_LABELS[id];
  }
  return null;
}

/**
 * Kategoriserer en mail. Prioritet:
 *   1) Gmail-labels (Lasses egne + Gmails systemkategorier) – grundsandhed.
 *   2) Regler på afsender/emne/uddrag (kunde → faktura → levering →
 *      kvittering → nyhedsbrev …). Fx "din ordre er leveret" = levering.
 * Ukendte mails samles under "Andet", så masse-kategorisering når alle mails.
 */
export function categorizeEmail(input: {
  from: string;
  subject?: string | null;
  snippet?: string | null;
  labelIds?: string[];
}): MailCategoryId {
  // 1) Labels først – de er sat af Gmail/Lasse selv og er derfor mest præcise.
  const byLabel = categoryFromGmailLabels(input.labelIds);
  if (byLabel) return byLabel;

  // 2) Regelbaseret fallback på indholdet.
  const from = (input.from ?? "").toLowerCase();
  const domain = from.split("@")[1] ?? "";
  const text = `${input.subject ?? ""} ${input.snippet ?? ""}`.toLowerCase();

  if (CLIENT_DOMAINS.some((d) => domain.includes(d))) return "kunde";
  if (/autoproff|t4g/.test(from) || /bilvurdering|vurdering klar|vurderingsrapport/.test(text))
    return "bilvurdering";
  if (/adgangskode|password|verificer|bekræft din konto|totrins|two-?factor|sikkerhedsadvarsel|mistænkelig login|sign-?in attempt|security alert/.test(text))
    return "sikkerhed";
  if (/invitation|inviteret dig|mødeindkaldelse|calendar invite|accepteret:|afslået:|tentativt:/.test(text))
    return "kalender";
  if (/regning|faktura|invoice|opkræv|betaling|mobilepay|rykker/.test(text))
    return "faktura";
  if (/leveret|delivered|afsendt|shipment|forsendelse|tracking|yunexpress|postnord|\bgls\b|\bdao\b/.test(text))
    return "levering";
  if (/ordrebekræft|kvittering|receipt|booking|billet|ticket|din ordre|your order|ordre|order/.test(text))
    return "kvittering";
  if (
    /nyhedsbrev|newsletter|unsubscribe|afmeld|level up your content/.test(text) ||
    /kajabimail|insideapple|apple\.com|facebookmail|meta/.test(from)
  )
    return "nyhedsbrev";
  if (/\brabat\w*|\budsalg\b|\bspar \d|% ?rabat|black friday|sidste chance|tilbud kun|kampagnepris|\bsale\b|\bdeal\b/.test(text))
    return "reklame";

  return "andet";
}
