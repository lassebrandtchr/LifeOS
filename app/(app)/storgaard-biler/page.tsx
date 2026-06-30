import { StorgaardOverview } from "@/components/storgaard/storgaard-overview";
import { getStorgaardStats } from "@/features/dashboard/stats";
import { getCalendarEvents, getMailMessages } from "@/features/integrations/queries";

export const metadata = { title: "Storgaard Biler" };

/**
 * Storgaard Biler – samler ALT arbejde ét sted: nøgletal + grafer, kommende
 * arbejdsaftaler og seneste arbejdsmails (alt filtreret til verden 'work').
 */
export default async function StorgaardBilerPage() {
  const [stats, allEvents, allMails] = await Promise.all([
    getStorgaardStats(),
    getCalendarEvents(200),
    getMailMessages(50),
  ]);

  const now = new Date().toISOString();
  const events = allEvents.filter(
    (e) => e.workspace === "work" && (e.startsAt ?? "") >= now.slice(0, 10),
  );
  const mails = allMails.filter((m) => m.workspace === "work");

  return <StorgaardOverview stats={stats} events={events} mails={mails} />;
}
