import { StorgaardOverview } from "@/components/storgaard/storgaard-overview";
import { getStorgaardStats } from "@/features/dashboard/stats";
import { getCalendarEvents, getMailMessages } from "@/features/integrations/queries";
import { getTasksByBucket } from "@/features/tasks/queries";
import { bucketOrder } from "@/features/tasks/constants";
import { buildActionList } from "@/features/dashboard/action-list";

export const metadata = { title: "Storgaard Biler" };

/**
 * Storgaard Biler – samler ALT arbejde ét sted: nøgletal + grafer, kommende
 * arbejdsaftaler og seneste arbejdsmails (alt filtreret til verden 'work').
 */
export default async function StorgaardBilerPage() {
  const [stats, allEvents, allMails, taskBuckets] = await Promise.all([
    getStorgaardStats(),
    getCalendarEvents(200),
    getMailMessages(50),
    getTasksByBucket(),
  ]);

  const now = new Date().toISOString();
  const events = allEvents.filter(
    (e) => e.workspace === "work" && (e.startsAt ?? "") >= now.slice(0, 10),
  );
  const mails = allMails.filter((m) => m.workspace === "work");
  const tasks = bucketOrder
    .flatMap((b) => taskBuckets[b])
    .filter((t) => t.workspace === "work");
  const actionGroups = buildActionList(tasks, mails, "work");

  return (
    <StorgaardOverview
      stats={stats}
      events={events}
      mails={mails}
      actionGroups={actionGroups}
    />
  );
}
