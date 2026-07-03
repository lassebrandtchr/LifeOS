/**
 * Kort emne-etiket pr. opgave – udledes automatisk af titlen og vises som en
 * lille farvet badge efter prioriteten i Action-listen ("Import af X" →
 * "Import"). Ren heuristik, ingen AI-kald: først en række kendte nøgleord
 * (mest specifik betydning vinder), ellers første "betydningsbærende" ord i
 * titlen (småord og almindelige "gør noget"-verber springes over).
 */

const TOPIC_RULES: { label: string; pattern: RegExp }[] = [
  { label: "Import", pattern: /\bimport\w*/i },
  { label: "Bud", pattern: /\bbud\b|\bbyd\w*/i },
  { label: "Reklamation", pattern: /reklamation\w*/i },
  { label: "Klargøring", pattern: /klargør\w*/i },
  { label: "Finansiering", pattern: /finansier\w*/i },
  { label: "Leasing", pattern: /\bleasing\w*|\blease\w*/i },
  { label: "Forsikring", pattern: /forsikring\w*/i },
  { label: "Aflevering", pattern: /\baflever\w*/i },
  { label: "Opkald", pattern: /\bring\b|\bringe\w*|\bopkald\w*|\bkontakt\w*/i },
  { label: "Mail", pattern: /\bmail\w*|\be-mail\w*|\bbesvar\w*/i },
  { label: "Møde", pattern: /\bmøde\w*/i },
  { label: "Indkøb", pattern: /\bindkøb\w*|\bhandle\b/i },
  { label: "Syn", pattern: /\bsyn\b|synsrapport|toldsyn\w*/i },
  { label: "Værksted", pattern: /værksted\w*|\breparation\w*|\breparer\w*/i },
  { label: "Marketing", pattern: /markedsføring|marketing|annonce\w*|opslag/i },
  { label: "Tilbud", pattern: /\btilbud\w*/i },
  { label: "Faktura", pattern: /\bfaktura\w*|\bbetaling\w*|\bregning\w*/i },
  { label: "Prøvekørsel", pattern: /prøvekør\w*/i },
];

// Småord + almindelige "gør noget"-verber, der aldrig er et godt emne i sig
// selv – fallback'en springer dem over og tager næste rigtige ord.
const SKIP_WORDS = new Set([
  "få", "fået", "faa", "tjek", "tjekket", "tjekke", "husk", "huske", "husker",
  "send", "sende", "sendt", "lav", "lave", "lavet", "giv", "give", "hent",
  "hente", "skriv", "skrive", "opret", "oprette", "følg", "følge", "find",
  "finde", "undersøg", "undersøge", "gennemgå", "se", "kig", "kigge", "book",
  "op", "på", "til", "med", "om", "af", "og", "i", "en", "et", "den", "det",
  "der", "de", "som", "vores", "min", "mit", "mine", "din", "dit", "dine",
  "hos", "fra", "for", "ved", "eller", "at", "ny", "nyt", "nye", "skal",
  "igennem", "ang", "vedr", "evt",
]);

/** Kort emne ("Import", "Bud", "Karla" …) eller null hvis intet fornuftigt findes. */
export function deriveTopic(title: string): string | null {
  if (!title.trim()) return null;

  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(title)) return rule.label;
  }

  // Fallback: første betydningsbærende ord i titlen.
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (const word of words) {
    if (word.length < 3) continue;
    if (SKIP_WORDS.has(word.toLowerCase())) continue;
    const clean = word.slice(0, 14);
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return null;
}

// Farver til emne-badgen – bevidst UDEN rød/orange/grøn, som prioriteterne
// ejer (Haster/Vigtigt/Kan vente), så de to badges aldrig kan forveksles.
const TOPIC_COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#2dd4bf", "#818cf8"];

/** Deterministisk farve pr. emne – samme emne får altid samme farve. */
export function topicColor(label: string): string {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TOPIC_COLORS[hash % TOPIC_COLORS.length];
}
