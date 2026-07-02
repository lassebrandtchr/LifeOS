/**
 * Byttebil – kort visnings-udtræk af Byttebil-feltet på Salg-opgaver
 * (Bud på bil / Import af bil), til brug i opgavelisten og Action-listen.
 *
 * Ren tekst-heuristik (ingen AI-kald): fjerner parenteser (fx
 * registreringsnummer), forkorter "fra <år>" til "<år>", og fjerner et
 * lille sæt kendte gearkasse-/støjord der ikke hjælper til at genkende
 * bilen ved et hurtigt blik. Ikke en perfekt opsummering af enhver
 * tekst – men dækker Lasses eget eksempel og lignende formuleringer.
 */

const NOISE_WORDS = [
  "dsg",
  "s-tronic",
  "stronic",
  "tiptronic",
  "automatgear",
  "automatgearkasse",
  "manuelt gear",
  "manuel",
];

export function summarizeTradeIn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;

  // Fjern alt i parenteser (fx "(reg nr: DA27482)").
  s = s.replace(/\([^)]*\)/g, " ");
  // "fra 2023" → "2023"
  s = s.replace(/\bfra\s+(\d{4})\b/gi, "$1");
  // Kendte gearkasse-/støjord.
  for (const w of NOISE_WORDS) {
    s = s.replace(new RegExp(`\\b${w}\\b`, "gi"), " ");
  }
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();

  return s || null;
}
