import { categories, type Priority, type Workspace } from "@/features/tasks/constants";

/**
 * Dansk "smart-tilføj"-parser.
 *
 * Forstår naturligt dansk, når man opretter en opgave, og udleder:
 *  - dato + klokkeslæt ("i morgen kl 10", "næste onsdag kl 09.00", "om 3 dage",
 *    "den 5. juni", "5/6")
 *  - kategori ud fra nøgleord ("prisskilt/design" → Markedsføring)
 *  - verden (Privat/Arbejde) + prioritet ("haster", "vigtigt")
 *  - en renset titel (uden dato/tid-floskler og "påmind mig om at"-præfiks)
 *
 * Ren funktion (ingen server-afhængigheder) → kan bruges både i browser
 * (live forhåndsvisning) og på serveren (når opgaven faktisk gemmes).
 * Dette er bevidst REGELBASERET – ikke en AI. Det er hurtigt og præcist til datoer.
 */

export type ParsedTask = {
  title: string;
  deadline: Date | null;
  categoryId: string | null;
  workspace: Workspace | null;
  priority: Priority | null;
};

const WEEKDAYS: Record<string, number> = {
  søndag: 0, mandag: 1, tirsdag: 2, onsdag: 3,
  torsdag: 4, fredag: 5, lørdag: 6,
};
const MONTHS = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];
const MONTHS_ALT = MONTHS.join("|");

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Nøgleord → kategori. Tjekkes i rækkefølge; første match vinder. */
const CATEGORY_KEYWORDS: { id: string; words: string[] }[] = [
  { id: "sociale_medier", words: ["instagram", "facebook", "tiktok", "sociale medier", "story", "reel", "opslag", "post", "linkedin", "youtube"] },
  { id: "markedsfoering", words: ["markedsf", "kampagne", "reklame", "prisskilt", "skilt", "design", "flyer", "banner", "brochure", "annonce", "video", "foto", "billeder", "redigér", "rediger"] },
  { id: "kundeopfoelgning", words: ["følg op", "opfølg", "kunde", "lead", "ring til", "ringe", "kontakt", "tilbagemelding", "henvendelse", "fremvisning"] },
  { id: "finansiering", words: ["finansier", "lån", "leasing", "lease", "kredit", "afbetaling", "santander"] },
  { id: "salg", words: ["salg", "sælg", "tilbud", "prøvekørsel", "byttebil", "slutseddel", "handel", "købsaftale", "indregistrer", "indregistrering", "bud på bil", "giv bud", "byd på", "importbil", "import af bil", "bilhandel"] },
  { id: "mail", words: ["mail", "e-mail", "email", "besvar", "svar på", "skriv til", "send til"] },
  { id: "administration", words: ["faktura", "regnskab", "moms", "bogfør", "administration", "papirarbejde", "bestil", "registrer", "synshal", "syn", "nummerplade", "forsikring", "dmr", "motorregister"] },
  { id: "tangevej_94", words: ["tangevej", "garage", "have", "renover", "maler", "vvs", "håndværker", "carport", "terrasse", "indkørsel", "hæk"] },
  { id: "familie", words: ["familie", "børn", "kone", "hanne", "fødselsdag", "skole", "datter", "søn", "barn", "institution", "forældremøde"] },
  { id: "oekonomi", words: ["regning", "betal", "bank", "budget", "økonomi", "opsparing", "skat", "pension"] },
  { id: "indkoeb", words: ["indkøb", "købe", "handle", "supermarked", "bestil hjem", "rema", "netto", "bilka"] },
  { id: "ferie", words: ["ferie", "rejse", "fly", "hotel", "sommerhus", "bestil rejse"] },
  { id: "personligt", words: ["læge", "tandlæge", "frisør", "træning", "motion", "fitness", "løbetur"] },
];

/** Ord der signalerer arbejde (Storgaard Biler), selv uden en tydelig kategori. */
const WORK_SIGNALS = [
  "vw", "volkswagen", "audi", "bmw", "mercedes", "tesla", "skoda", "toyota",
  "ford", "kia", "hyundai", "peugeot", "renault", "opel", "seat", "cupra",
  "id.4", "id4", "bil", "biler", "dæk", "gummimåtter", "klargøring", "klargør",
  "værksted", "lager", "stelnummer", "kunde", "leasing", "lease", "showroom",
  "prøvekørsel", "tilbud", "salgsafd", "indregistrer", "nummerplade", "storgaard",
  "bud", "reservedel", "reservedele",
];

/** Ord der signalerer privat, selv uden en tydelig kategori. */
const PRIVATE_SIGNALS = [
  "hjemme", "privat", "os selv", "weekend", "min mor", "min far",
];

/**
 * Navne → verden. Personer fra arbejde (Storgaard Biler) vs. privat. Navne er
 * et STÆRKT signal og vinder over nøgleord, så fx "Ring til Hanne" bliver privat,
 * selv om "ring til" normalt peger på arbejde. Matches som hele ord (\b), så
 * korte navne som "Ea", "Bo" og "Kim" ikke fanges midt i andre ord.
 */
const WORK_NAMES = [
  "jens", "peter", "morten", "mads", "ebbe", "kim", "michael", "tommy",
];
const PRIVATE_NAMES = [
  "ea", "nohr", "hanne", "lotte", "bo", "mike", "louise", "mathilde", "sarah",
  "frederik", "niki", "michelle", "jamie", "oliver", "christina", "jordan",
  "anders", "jackie", "irene", "steffen", "karina",
];

const nameRegex = (names: string[]) =>
  new RegExp(`\\b(?:${names.map(escapeReg).join("|")})\\b`, "i");
const WORK_NAME_RE = nameRegex(WORK_NAMES);
const PRIVATE_NAME_RE = nameRegex(PRIVATE_NAMES);

/** Verden ud fra navne i teksten (eller null hvis ingen kendt person nævnes). */
export function workspaceFromNames(text: string): Workspace | null {
  if (WORK_NAME_RE.test(text)) return "work";
  if (PRIVATE_NAME_RE.test(text)) return "private";
  return null;
}

export function parseTaskInput(input: string, now: Date = new Date()): ParsedTask {
  const original = input.trim();
  const lower = original.toLowerCase();
  let working = ` ${original} `;
  const strip = (matched: string) => {
    working = working.replace(new RegExp(escapeReg(matched), "i"), " ");
  };

  // ───────────────────────────── Klokkeslæt ─────────────────────────────
  let hour: number | null = null;
  let minute = 0;
  const tm =
    original.match(/\b(?:kl\.?|klokken)\s*(\d{1,2})(?:[.:](\d{2}))?\b/i) ||
    original.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (tm) {
    hour = parseInt(tm[1], 10);
    if (tm[2]) minute = parseInt(tm[2], 10);
    if (hour > 23) hour = null;
    strip(tm[0]);
  }

  // ─────────────────────────────── Dato ─────────────────────────────────
  let target: Date | null = null;
  const fromOffset = (days: number) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
  };

  let dm: RegExpMatchArray | null;
  if ((dm = lower.match(/\bi\s*overmorgen\b/))) {
    target = fromOffset(2);
    strip(dm[0]);
  } else if ((dm = lower.match(/\bi\s*morgen\b/))) {
    target = fromOffset(1);
    strip(dm[0]);
  } else if ((dm = lower.match(/\b(i\s*dag|idag)\b/))) {
    target = fromOffset(0);
    strip(dm[0]);
  } else if ((dm = lower.match(/\bom\s+(\d+)\s+dage?\b/))) {
    target = fromOffset(parseInt(dm[1], 10));
    strip(dm[0]);
  } else if ((dm = lower.match(/\bom\s+en\s+uge\b/))) {
    target = fromOffset(7);
    strip(dm[0]);
  } else if ((dm = lower.match(/\bom\s+(\d+)\s+uger\b/))) {
    target = fromOffset(parseInt(dm[1], 10) * 7);
    strip(dm[0]);
  } else if (
    (dm = lower.match(
      /\b(?:på\s+)?(næste\s+)?(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\b/,
    ))
  ) {
    const next = Boolean(dm[1]);
    const targetDay = WEEKDAYS[dm[2]];
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    let diff = (targetDay - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // den kommende, ikke i dag
    if (next) diff += 7;
    d.setDate(d.getDate() + diff);
    target = d;
    strip(dm[0]);
  } else if (
    (dm = lower.match(new RegExp(`\\b(?:den\\s+)?(\\d{1,2})\\.?\\s+(${MONTHS_ALT})\\b`)))
  ) {
    const day = parseInt(dm[1], 10);
    const month = MONTHS.indexOf(dm[2]);
    const d = new Date(now.getFullYear(), month, day, 0, 0, 0, 0);
    if (d.getTime() < fromOffset(0).getTime()) d.setFullYear(d.getFullYear() + 1);
    target = d;
    strip(dm[0]);
  } else if ((dm = lower.match(/\b(\d{1,2})\/(\d{1,2})\b/))) {
    const day = parseInt(dm[1], 10);
    const month = parseInt(dm[2], 10) - 1;
    const d = new Date(now.getFullYear(), month, day, 0, 0, 0, 0);
    if (d.getTime() < fromOffset(0).getTime()) d.setFullYear(d.getFullYear() + 1);
    target = d;
    strip(dm[0]);
  } else if ((dm = lower.match(/\bden\s+(\d{1,2})\.\b/))) {
    const day = parseInt(dm[1], 10);
    const d = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0);
    if (d.getTime() < fromOffset(0).getTime()) d.setMonth(d.getMonth() + 1);
    target = d;
    strip(dm[0]);
  }

  // ───────────────────────────── Saml deadline ──────────────────────────
  let deadline: Date | null = null;
  if (target) {
    deadline = new Date(target);
    deadline.setHours(hour ?? 9, hour !== null ? minute : 0, 0, 0);
  } else if (hour !== null) {
    deadline = new Date(now);
    deadline.setHours(hour, minute, 0, 0);
    if (deadline.getTime() <= now.getTime()) {
      deadline.setDate(deadline.getDate() + 1); // tidspunkt allerede passeret → i morgen
    }
  }

  // ─────────────────────────────── Kategori ─────────────────────────────
  let categoryId: string | null = null;
  for (const group of CATEGORY_KEYWORDS) {
    if (group.words.some((w) => lower.includes(w))) {
      categoryId = group.id;
      break;
    }
  }

  // ───────────────────────────────── Verden ─────────────────────────────
  // 1) Navne på personer vinder altid (stærkeste signal).
  let workspace: Workspace | null = workspaceFromNames(original);
  // 2) Ellers: kategoriens verden.
  if (!workspace && categoryId) {
    workspace = categories.find((c) => c.id === categoryId)?.workspace ?? null;
  }
  // 3) Ellers: løse privat-/arbejdssignaler.
  if (!workspace && PRIVATE_SIGNALS.some((w) => lower.includes(w))) {
    workspace = "private";
  }
  if (!workspace && WORK_SIGNALS.some((w) => lower.includes(w))) {
    workspace = "work";
  }

  // ──────────────────────────────── Prioritet ───────────────────────────
  // 1) Tydelige nøgleord vinder altid.
  let priority: Priority | null = null;
  // Haster: tidskritiske handlinger (aflevering, slutseddel, tilbud) + klassikere.
  if (
    /\b(haster|haste|akut|straks|med det samme|nu|asap|hurtigst|aflever|aflevering|slutseddel|tilbud)\b/.test(
      lower,
    )
  ) {
    priority = "urgent";
  }
  // Vigtigt: bilhandel/import (giv bud, find importbil o.l.) + klassikere.
  else if (
    /\b(bud på bil|giv bud|byd på|bud på|importbil|find import|import af bil|bilhandel|vigtigt|vigtig|husk|skal|vær obs|deadline|frist|inden)\b/.test(
      lower,
    )
  ) {
    priority = "important";
  } else if (
    /\b(kan vente|når der er tid|naar der er tid|lav prioritet|ingen hast|en gang)\b/.test(
      lower,
    )
  ) {
    priority = "can_wait";
  }

  // 2) Ellers: udled prioritet af deadline, så ALT ikke ender som "kan vente".
  if (!priority && deadline) {
    const startOfToday = fromOffset(0).getTime();
    const diffDays = Math.floor((deadline.getTime() - startOfToday) / 86_400_000);
    if (diffDays <= 0) priority = "urgent"; // i dag / forfalden
    else if (diffDays <= 2) priority = "important"; // inden for 2 dage
    else priority = "can_wait"; // denne uge og langt ude
  }

  // ───────────────────────────── Rens titlen ────────────────────────────
  let title = working
    .replace(
      /^\s*(påmind\s+mig\s+(?:om|på)\s+at|påmind\s+mig\s+(?:om|på)|husk\s+(?:mig\s+)?(?:om|på)?\s*at|husk(?:\s+mig)?|mind\s+mig\s+om\s+at|remind\s+me\s+to)\s+/i,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "")
    .trim();

  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    title = original; // fald tilbage hvis vi kom til at fjerne for meget
  }

  return { title, deadline, categoryId, workspace, priority };
}
