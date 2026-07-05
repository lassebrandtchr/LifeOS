/**
 * Kort emne-etiket pr. opgave/mail – udledes automatisk af indholdet og vises
 * som en lille farvet badge efter prioriteten i Action-listen
 * ("Import af X" → "Import"). Ren heuristik, ingen AI-kald.
 *
 * To lag:
 *   1) En stor regeltabel med kendte, MENINGSFULDE emner (mest specifik
 *      betydning vinder). For mails testes reglerne også mod afsender +
 *      uddrag (context), ikke kun emnefeltet.
 *   2) Fallback: et egennavn fra titlen (navn/bilmodel/firma – ord med stort
 *      begyndelsesbogstav INDE i sætningen, fx "Karla" eller "Arteon").
 *      Titlens FØRSTE ord bruges bevidst aldrig – det er altid stort skrevet
 *      og gav meningsløse etiketter som "Get", "Målt" eller "Din".
 *
 * Findes intet meningsfuldt, returneres null (ingen badge er bedre end en
 * forkert badge).
 */

const TOPIC_RULES: { label: string; pattern: RegExp }[] = [
  // ── Bilforretning (Storgaard) – mest specifikke først ──
  { label: "Bilvurdering", pattern: /autoproff|t4g|\bvurdering\w*/i },
  { label: "Prøvekørsel", pattern: /prøvekør\w*/i },
  { label: "Reklamation", pattern: /reklamation\w*|\bklage\w*/i },
  { label: "Klargøring", pattern: /klargør\w*/i },
  { label: "Registrering", pattern: /indregistrer\w*|registreringsattest|nummerplade\w*|omregistrer\w*/i },
  { label: "Syn", pattern: /\bsyn\b|synsrapport|toldsyn\w*|\bsynshal\w*/i },
  { label: "Værksted", pattern: /værksted\w*|\breparation\w*|\breparer\w*|mekaniker\w*/i },
  { label: "Service", pattern: /serviceeftersyn\w*|servicetjek\w*|olieskift\w*/i },
  { label: "Dæk", pattern: /\bdæk\b|dækskift\w*|vinterdæk|sommerdæk|\bfælge\w*/i },
  { label: "Transport", pattern: /\btransport\w*|\bfragt\w*|autotransport|\bafhent\w*/i },
  { label: "Annonce", pattern: /bilbasen|biltorvet|\bdba\b|\bannonce\w*|\bopslag\b/i },
  { label: "Import", pattern: /\bimport\w*|toldstyrelsen|motorregist\w*/i },
  { label: "Bud", pattern: /\bbud\b|\bbyd\w*/i },
  { label: "Salg", pattern: /\bsalg\w*|\bsolgt\b|\bsælg\w*|slutseddel\w*/i },
  { label: "Finansiering", pattern: /finansier\w*|\bbillån\w*|santander|resurs\b/i },
  { label: "Leasing", pattern: /\bleasing\w*|\blease\w*/i },
  { label: "Forsikring", pattern: /forsikring\w*|\bpolice\w*/i },
  { label: "Aflevering", pattern: /\baflever\w*|\budlever\w*/i },
  { label: "Kunde", pattern: /\bkunde\w*/i },

  // ── Økonomi & administration ──
  { label: "Faktura", pattern: /\bfaktura\w*|\bregning\w*|\bopkræv\w*|\brykker\w*|\binvoice\b/i },
  { label: "Betaling", pattern: /\bbetaling\w*|mobilepay|\brefusion\w*|\brefunder\w*/i },
  { label: "Regnskab", pattern: /\bregnskab\w*|\bmoms\w*|\bbogfør\w*|\bskat\b|\bskatte\w*|dinero|e-conomic/i },
  { label: "Tilbud", pattern: /\btilbud\w*|black ?friday|\brabat\w*|\budsalg\b|% ?rabat|\bspar \d|\bsale\b|\bdeal\w*/i },
  { label: "Kvittering", pattern: /kvittering\w*|ordrebekræft\w*|\breceipt\b|order confirm\w*/i },
  { label: "Ordre", pattern: /\bordre\w*|\bbestilling\w*|\bbestilt\b|your order/i },
  { label: "Levering", pattern: /\blever(?:et|ing|es)\b|\bpakke\w*|\bforsendelse\w*|tracking|\bdelivered\b|\bshipment\b|postnord|\bgls\b|\bdao\b/i },

  // ── Kommunikation & aftaler ──
  { label: "Møde", pattern: /\bmøde\w*|teams-?møde/i },
  { label: "Kalender", pattern: /\binvitation\w*|\binviteret\b|kalender\w*|\bcalendar\b/i },
  { label: "Opkald", pattern: /\bringe?\b|\bopkald\w*|ring op|ring til/i },
  { label: "Mail", pattern: /\bbesvar\w*|svar på mail|følg op på mail/i },

  // ── Marketing ──
  { label: "Marketing", pattern: /markedsføring|marketing|kampagne\w*|sociale medier|facebook-?opslag|instagram/i },

  // ── Privat ──
  { label: "Indkøb", pattern: /\bindkøb\w*|handle ind|dagligvarer/i },
  { label: "Sundhed", pattern: /\blæge\w*|tandlæge\w*|\bapotek\w*|fysioterap\w*/i },
  { label: "Ferie", pattern: /\bferie\w*|\brejse\w*|flybillet\w*|booking\.com|airbnb/i },
  { label: "Bolig", pattern: /husleje\w*|el-?regning\w*|\bvarme\w*|ejendom\w*|tangevej/i },

  // ── Mail-typiske (mest generiske – testes sidst) ──
  { label: "Sikkerhed", pattern: /adgangskode|\bpassword\b|log ?ind|\blogin\b|verificer\w*|bekræft din|totrins|two-?factor|sikkerhedsadvarsel|mistænkelig/i },
  { label: "Nyhedsbrev", pattern: /nyhedsbrev\w*|newsletter|unsubscribe|\bafmeld\w*/i },
];

// Ord der aldrig er et godt emne i sig selv (dansk + engelsk småord, "gør
// noget"-verber, uge-/månedsnavne). Bruges af egennavns-fallbacken.
const SKIP_WORDS = new Set([
  // Danske småord/verber
  "få", "fået", "faa", "tjek", "tjekket", "tjekke", "husk", "huske", "husker",
  "send", "sende", "sendt", "lav", "lave", "lavet", "giv", "give", "hent",
  "hente", "skriv", "skrive", "opret", "oprette", "følg", "følge", "find",
  "finde", "undersøg", "undersøge", "gennemgå", "se", "kig", "kigge", "book",
  "op", "på", "til", "med", "om", "af", "og", "i", "en", "et", "den", "det",
  "der", "de", "som", "vores", "min", "mit", "mine", "din", "dit", "dine",
  "hos", "fra", "for", "ved", "eller", "at", "ny", "nyt", "nye", "skal",
  "igennem", "ang", "vedr", "evt", "her", "nu", "kun", "alle", "mere", "mest",
  "godt", "god", "kære", "hej", "tak",
  // Engelske småord/verber (typiske i marketing-mails)
  "get", "your", "you", "the", "and", "for", "with", "new", "now", "how",
  "what", "why", "this", "that", "from", "off", "our", "are", "can", "will",
  "just", "last", "first", "best", "more", "most", "free", "save", "deal",
  "sale", "shop", "buy", "don", "dont", "here", "today", "only", "all",
  // Uge- og månedsnavne (begge sprog)
  "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "januar", "februar", "marts", "april", "maj", "juni", "juli", "august",
  "september", "oktober", "november", "december", "january", "february",
  "march", "may", "june", "july", "october",
]);

/** Fjerner gentagne svar-/videresend-præfikser ("SV: VS: Re: …"). */
function stripReplyPrefixes(title: string): string {
  let t = title.trim();
  const re = /^(sv|vs|re|fw|fwd|aw)\s*:\s*/i;
  while (re.test(t)) t = t.replace(re, "");
  return t;
}

/**
 * Kort emne ("Import", "Faktura", "Karla" …) eller null.
 * @param title   Opgavetitel eller mail-emne.
 * @param context Ekstra signal for mails (afsender + uddrag) – testes KUN af
 *                regeltabellen, aldrig af egennavns-fallbacken.
 */
export function deriveTopic(title: string, context?: string): string | null {
  const cleanTitle = stripReplyPrefixes(title);
  if (!cleanTitle) return null;

  // 1) Regler: titlen alene først (stærkest signal), derefter titel+context.
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(cleanTitle)) return rule.label;
  }
  if (context) {
    const full = `${cleanTitle} ${context}`;
    for (const rule of TOPIC_RULES) {
      if (rule.pattern.test(full)) return rule.label;
    }
  }

  // 2) Fallback: første egennavn INDE i titlen (aldrig første ord – det er
  //    altid stort skrevet og siger sjældent noget: "Målt", "Get", "Din" …).
  const words = cleanTitle
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (word.length < 3) continue;
    if (!/^\p{Lu}/u.test(word)) continue; // kun egennavne (stort bogstav)
    if (/^\p{Lu}+$/u.test(word) && word.length > 4) continue; // RÅBE-ORD fra marketing-mails
    if (SKIP_WORDS.has(word.toLowerCase())) continue;
    return word.slice(0, 14);
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
