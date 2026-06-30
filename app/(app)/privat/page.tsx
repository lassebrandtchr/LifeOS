import { PrivatOverview } from "@/components/privat/privat-overview";
import { getCalendarEvents, getMailMessages } from "@/features/integrations/queries";

export const metadata = { title: "Privat" };

/** Privat – samler alt privat: hurtige handlinger, private aftaler og mails. */
export default async function PrivatPage() {
  const [allEvents, allMails] = await Promise.all([
    getCalendarEvents(200),
    getMailMessages(50),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const events = allEvents.filter(
    (e) => e.workspace !== "work" && (e.startsAt ?? "") >= today,
  );
  const mails = allMails.filter((m) => m.workspace !== "work");

  return <PrivatOverview events={events} mails={mails} />;
}
