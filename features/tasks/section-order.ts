import type { Workspace } from "@/features/tasks/constants";

/**
 * Fælles definition af "arbejdstid" for HELE appen (dashboard-hilsen,
 * "Arbejdstid"-badge, indbakke/kalender-filtrering, opgave-sektionernes
 * rækkefølge og forsidens "Hurtige handlinger"). Ét sted, så der aldrig kan
 * opstå mismatch mellem fx en hilsen der siger "Privat tid" og en sektion,
 * der stadig viser arbejdsopgaver.
 *
 * Arbejdstid → Storgaard Biler øverst:
 *   - Mandag–fredag: 08.45–17.00
 *   - Søndag:        12.00–16.00
 * Uden for arbejdstid → Privat øverst.
 *
 * VIGTIGT: klokkeslættet regnes EKSPLICIT i dansk tid (Europe/Copenhagen).
 * Date.getHours() bruger maskinens egen tidszone – og på Vercel kører
 * serveren i UTC, så "8.45–17.00" blev reelt evalueret som 10.45–19.00
 * dansk sommertid, og forsiden skiftede derfor aldrig til arbejdstid om
 * morgenen. Intl-baseret udregning giver samme (danske) svar på både
 * server og i browseren.
 */

/** Ugedag (0 = søndag … 6 = lørdag) + decimal-time i dansk tid. */
export function copenhagenClock(date: Date = new Date()): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const DAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = DAYS[get("weekday")] ?? date.getDay();
  const hour = Number(get("hour")) + Number(get("minute")) / 60;
  return { day, hour };
}

export function isWorkHours(date: Date = new Date()): boolean {
  const { day, hour } = copenhagenClock(date);
  if (day >= 1 && day <= 5) return hour >= 8.75 && hour < 17;
  if (day === 0) return hour >= 12 && hour < 16;
  return false; // lørdag = fri
}

export function getWorkspaceOrder(date: Date = new Date()): Workspace[] {
  return isWorkHours(date) ? ["work", "private"] : ["private", "work"];
}
