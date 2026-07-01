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
 * Ren funktion, så server og browser kan regne det samme ud (ingen mismatch).
 */
export function isWorkHours(date: Date = new Date()): boolean {
  const day = date.getDay(); // 0 = søndag, 6 = lørdag
  const hour = date.getHours() + date.getMinutes() / 60;
  if (day >= 1 && day <= 5) return hour >= 8.75 && hour < 17;
  if (day === 0) return hour >= 12 && hour < 16;
  return false; // lørdag = fri
}

export function getWorkspaceOrder(date: Date = new Date()): Workspace[] {
  return isWorkHours(date) ? ["work", "private"] : ["private", "work"];
}
