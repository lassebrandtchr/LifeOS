import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import {
  getTasksByBucket,
  getProjects,
  getHistory,
  getActivity,
  getCompletedCounts,
} from "@/features/tasks/queries";
import { getWorkspaceOrder } from "@/features/tasks/section-order";

export const metadata = { title: "Opgaver" };

/**
 * Opgaver – LifeOS' second brain. Henter opgaver, projekter, historik,
 * aktivitet og statistik på serveren (parallelt) og sender dem til
 * klient-arbejdsfladen. Noter ligger nu på den enkelte opgave/projekt.
 *
 * ?aaben=<id> kommer fra "Hurtige handlinger" på andre sider og åbner den
 * netop oprettede opgaves editor automatisk.
 */
export default async function OpgaverPage({
  searchParams,
}: {
  searchParams: Promise<{ aaben?: string }>;
}) {
  const { aaben } = await searchParams;
  const [buckets, projects, history, activity, completedCounts] =
    await Promise.all([
      getTasksByBucket(),
      getProjects(),
      getHistory(),
      getActivity(),
      getCompletedCounts(),
    ]);

  return (
    <TasksWorkspace
      initialBuckets={buckets}
      projects={projects}
      history={history}
      activity={activity}
      completedCounts={completedCounts}
      initialOrder={getWorkspaceOrder()}
      openTaskId={aaben}
    />
  );
}
