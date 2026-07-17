/**
 * Udtræk af FORFALDSDATO fra en fakturas tekst (mailtekst eller PDF-tekst).
 *
 * Ren heuristik, ingen AI. Den leder efter danske betalings-nøgleord og en
 * dato tæt på dem. Fungerer godt på fakturaer, der SKRIVER datoen som tekst,
 * men kan ikke læse indskannede (billed-)PDF'er uden tekstlag – derfor er
 * resultatet altid et FORSLAG, som Lasse kan rette manuelt.
 *
 * Returnerer en ISO-dato ("2026-07-31") eller null.
 */

const MONTHS: Record<string, number> = {
  januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, sept: 9, okt: 10, nov: 11, dec: 12,
};

// Nøgleord der signalerer en forfaldsdato (dansk + lidt engelsk).
const DUE_KEYWORDS = [
  "forfaldsdato", "forfald", "betalingsfrist", "betalingsdato",
  "sidste rettidige betaling", "sidste rettidige indbetaling",
  "betales senest", "betalingsdag", "seneste betaling", "due date",
  "payment due", "betalingsbetingelser",
];

function clampDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Normalisér 2-cifret årstal.
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null; // ugyldig (fx 31. feb)
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d
    .toString()
    .padStart(2, "0")}`;
}

/** Find ALLE datoer i et tekststykke, som ISO-strenge (i den rækkefølge de står). */
function findDates(text: string): string[] {
  const out: string[] = [];

  // 1) Numerisk: 31-07-2026, 31.07.2026, 31/07/2026, 31/07-2026, 2026-07-31
  const numeric =
    /\b(\d{4})[-.](\d{1,2})[-.](\d{1,2})\b|\b(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})\b/g;
  for (const m of text.matchAll(numeric)) {
    if (m[1]) {
      const iso = clampDate(Number(m[1]), Number(m[2]), Number(m[3])); // ÅÅÅÅ-MM-DD
      if (iso) out.push(iso);
    } else {
      const iso = clampDate(Number(m[6]), Number(m[5]), Number(m[4])); // DD-MM-ÅÅÅÅ
      if (iso) out.push(iso);
    }
  }

  // 2) Tekst-måned: "31. juli 2026", "31 juli 2026", "31. jul 2026"
  const worded = /\b(\d{1,2})\.?\s+([a-zæøå]+)\.?\s+(\d{4})\b/gi;
  for (const m of text.matchAll(worded)) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) {
      const iso = clampDate(Number(m[3]), month, Number(m[1]));
      if (iso) out.push(iso);
    }
  }

  return out;
}

export function parseDanishDueDate(rawText: string | null | undefined): string | null {
  if (!rawText) return null;
  const text = rawText.replace(/\s+/g, " ");
  const lower = text.toLowerCase();

  // Find den FØRSTE forekomst af et betalings-nøgleord, og se efter en dato i
  // et vindue lige efter det (typisk "Betalingsfrist: 31-07-2026").
  let best: string | null = null;
  let bestPos = Infinity;
  for (const kw of DUE_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx === -1) continue;
    // Kig i de næste ~40 tegn efter nøgleordet.
    const window = text.slice(idx, idx + kw.length + 40);
    const dates = findDates(window);
    if (dates.length > 0 && idx < bestPos) {
      best = dates[0];
      bestPos = idx;
    }
  }
  if (best) return best;

  // Fald tilbage: står der KUN én dato i hele teksten, så brug den (mange
  // simple fakturaer skriver blot forfaldsdatoen uden en tydelig etiket).
  const all = findDates(text);
  const unique = [...new Set(all)];
  if (unique.length === 1) return unique[0];

  return null;
}
