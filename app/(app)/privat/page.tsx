import { PrivatOverview } from "@/components/privat/privat-overview";
import { getCalendarEvents, getMailMessages } from "@/features/integrations/queries";
import { getTasksByBucket } from "@/features/tasks/queries";
import { bucketOrder } from "@/features/tasks/constants";
import { buildActionList } from "@/features/dashboard/action-list";

export const metadata = { title: "Privat" };

/** Privat – samler alt privat: hurtige handlinger, private aftaler og mails. */
export default async function PrivatPage() {
  const [allEvents, allMails, taskBuckets] = await Promise.all([
    getCalendarEvents(200),
    getMailMessages(50),
    getTasksByBucket(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const events = allEvents.filter(
    (e) => e.workspace !== "work" && (e.startsAt ?? "") >= today,
  );
  const mails = allMails.filter((m) => m.workspace !== "work");
  const tasks = bucketOrder
    .flatMap((b) => taskBuckets[b])
    .filter((t) => t.workspace !== "work");
  const actionGroups = buildActionList(tasks, mails, "private");

  return <PrivatOverview events={events} mails={mails} actionGroups={actionGroups} />;
}
