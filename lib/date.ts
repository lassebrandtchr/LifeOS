/**
 * Danske dato-/tidsformateringer (tidszone = Europe/Copenhagen).
 *
 * Bruges på server-komponenter (Mail, Kalender). Da formateringen sker på
 * serveren og bages ind i HTML'en, opstår der ingen hydration-mismatch.
 */

const TZ = "Europe/Copenhagen";
const LOCALE = "da-DK";

function toDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Dag + måned + klokkeslæt, fx "22. jun. 09:13". */
export function formatDateTime(iso: string | null): string {
  const d = toDate(iso);
  if (!d) return "";
  return d.toLocaleString(LOCALE, {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Kun klokkeslæt, fx "08:45". */
export function formatTime(iso: string | null): string {
  const d = toDate(iso);
  if (!d) return "";
  return d.toLocaleString(LOCALE, {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Dato-nøgle (YYYY-MM-DD) i Copenhagen-tid – til gruppering pr. dag. */
export function dayKey(iso: string | null): string {
  const d = toDate(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * Overskrift for en dag, fx "I dag · tirsdag 23. jun." eller
 * "torsdag 25. jun.". Relativ for i dag/i morgen/i går.
 */
export function formatDayHeading(iso: string | null): string {
  const d = toDate(iso);
  if (!d) return "";
  const key = dayKey(iso);
  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: TZ });
  const tomorrow = new Date(now.getTime() + 86_400_000).toLocaleDateString(
    "en-CA",
    { timeZone: TZ },
  );
  const yesterday = new Date(now.getTime() - 86_400_000).toLocaleDateString(
    "en-CA",
    { timeZone: TZ },
  );

  const full = d.toLocaleDateString(LOCALE, {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  if (key === todayKey) return `I dag · ${full}`;
  if (key === tomorrow) return `I morgen · ${full}`;
  if (key === yesterday) return `I går · ${full}`;
  return full;
}
