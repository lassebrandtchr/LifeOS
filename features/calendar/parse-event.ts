import { parseTaskInput } from "@/features/tasks/parse";
import type { Workspace } from "@/features/tasks/constants";

/**
 * Dansk begivenheds-parser (Fase 9).
 *
 * Forstår naturligt dansk som "Spise hos Mike & Louise på næste fredag kl 17.30"
 * og udleder titel, start/slut og evt. sted. Genbruger den eksisterende dansk-
 * forståelse fra opgave-parseren (dato/tid), så det er konsistent og hurtigt.
 * REGELBASERET – ingen AI.
 *
 * Ren funktion → bruges både i browseren (live forhåndsvisning i pop-op'en) og
 * på serveren (når begivenheden faktisk gemmes).
 */

export type ParsedEvent = {
  title: string;
  start: Date | null;
  end: Date | null;
  /** true hvis et klokkeslæt rent faktisk blev nævnt (ellers er start gættet). */
  hasTime: boolean;
  location: string | null;
  workspace: Workspace;
};

const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1 time

/**
 * Forsøger at finde et sted efter "hos"/"hjemme hos". Konservativt.
 * NB: vi bruger `(?=\s)` frem for `\b` efter nøgleord, fordi `\b` ikke virker
 * efter danske bogstaver som "på"/"å" (ikke et ASCII-ordtegn).
 */
function extractLocation(input: string): string | null {
  const m = input.match(/\b(?:hjemme\s+hos|hos)\s+(.+)/i);
  if (!m) return null;
  let rest = m[1]
    // skær ved første dato/tids-indikator
    .split(/\s+(?:på|i|den|kl\.?|klokken|næste|imorgen|om)(?=\s)/i)[0]
    .split(/\s+i\s*morgen\b/i)[0]
    .split(/\s+\d{1,2}[/.:]/)[0];
  rest = rest.replace(/[\s,.;:-]+$/, "").trim();
  return rest.length > 1 ? rest : null;
}

export function parseEventInput(input: string, now: Date = new Date()): ParsedEvent {
  const text = input.trim();
  const hasTime = /\b(?:kl\.?|klokken)\s*\d{1,2}|\b\d{1,2}[:.]\d{2}\b/i.test(text);

  // Genbrug opgave-parseren til titel + dato/tid + (arbejde/null).
  const t = parseTaskInput(text, now);

  let start: Date | null = t.deadline;
  let end: Date | null = null;
  if (start) {
    // Hvis intet klokkeslæt blev nævnt, så foreslå kl. 12.00 (neutralt).
    if (!hasTime) {
      start = new Date(start);
      start.setHours(12, 0, 0, 0);
    }
    end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  }

  return {
    title: t.title,
    start,
    end,
    hasTime,
    location: extractLocation(text),
    // Begivenheder er private som standard (Lasses private Google-kalender).
    workspace: t.workspace ?? "private",
  };
}
