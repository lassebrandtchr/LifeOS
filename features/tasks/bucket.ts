import type { Bucket } from "@/features/tasks/constants";

/**
 * Udleder hvilken kolonne (bucket: i dag/denne uge/senere) en opgave hører
 * til ud fra dens deadline. Ren funktion, ingen "use server"/"use client" –
 * kan bruges både i server actions (features/tasks/actions.ts) og i
 * opgave-editoren (components/tasks/detail-context.tsx), som siden
 * fjernelsen af det manuelle "Hvornår"-felt selv skal genudlede bucket ved
 * hvert gem, i stedet for at stole på en fastfrossen værdi.
 */
export function deriveBucketFromDeadline(deadline: Date | null): Bucket {
  if (!deadline) return "today";
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (deadline.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return "today";
  if (diffDays <= 7) return "week";
  return "later";
}
